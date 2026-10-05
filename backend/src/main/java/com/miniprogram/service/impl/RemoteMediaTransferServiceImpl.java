package com.miniprogram.service.impl;

import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.dto.system.UploadResultVO;
import com.miniprogram.service.FileUploadService;
import com.miniprogram.service.RemoteMediaTransferService;
import com.miniprogram.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.URI;
import java.net.URL;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * 外链媒体转存实现。
 *
 * 🔴 SSRF 防护是这里最要紧的一环：这是「按运营给的 URL 发起服务端请求」的接口，
 * 不做内网地址拦截就等于给了内网探测能力（169.254.169.254 云元数据、127.0.0.1 后端自身等）。
 * 判定顺序刻意放在真正建连接之前：先 parse 主机名 → DNS 解析 → 逐个校验 IP 段 → 才允许连。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RemoteMediaTransferServiceImpl implements RemoteMediaTransferService {

    /** 单文件上限：视频 50MB，与商品宣传视频的前端校验保持一致 */
    private static final long MAX_BYTES = 50L * 1024 * 1024;

    /** 允许的扩展名（与 FileUploadService 的白名单对齐，视频仅 mp4） */
    private static final Set<String> IMAGE_EXT = new HashSet<>(Arrays.asList("jpg", "jpeg", "png", "gif", "bmp", "webp"));
    private static final Set<String> VIDEO_EXT = new HashSet<>(Arrays.asList("mp4"));

    private static final Set<String> ALLOWED_EXT = new HashSet<>() {{
        addAll(IMAGE_EXT);
        addAll(VIDEO_EXT);
    }};

    private static final int TIMEOUT_MS = 15_000;

    private final FileUploadService fileUploadService;
    private final SystemConfigService systemConfigService;

    @Override
    public UploadResultVO transfer(String remoteUrl, String subDir) {
        if (!StringUtils.hasText(remoteUrl)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "远程地址不能为空");
        }
        String trimmed = remoteUrl.trim();

        // 1) 协议白名单：只允许 http/https，挡掉 file:/jar:/gopher: 等
        URI uri = parseAndValidate(trimmed);

        // 2) SSRF 校验：解析出的每一个 IP 都必须是公网地址
        assertPublicHost(uri.getHost());

        // 3) 扩展名白名单：不在白名单直接拒，不给「下载任意文件再落盘」的机会
        String path = uri.getPath() == null ? "" : uri.getPath();
        String ext = extractExtension(path);
        if (!StringUtils.hasText(ext) || !ALLOWED_EXT.contains(ext.toLowerCase(Locale.ROOT))) {
            throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(),
                    "仅支持转存图片或 MP4 视频（jpg/png/webp/gif/mp4）");
        }

        // 4) 真实下载
        long configuredMax = readConfiguredMaxSize();
        long cap = Math.min(MAX_BYTES, configuredMax);
        byte[] bytes = download(uri, cap);

        String fileName = buildFileName(path, ext);
        UploadResultVO result = fileUploadService.uploadBytes(bytes, fileName, subDir);
        log.info("外链媒体已转存 remote={} -> {} ({} bytes)", trimmed, result.getUrl(), bytes.length);
        return result;
    }

    private URI parseAndValidate(String url) {
        URI uri;
        try {
            uri = URI.create(url);
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "地址格式非法");
        }
        String scheme = uri.getScheme();
        if (scheme == null || !("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme))) {
            throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "仅支持 http/https 地址");
        }
        if (!StringUtils.hasText(uri.getHost())) {
            throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "地址缺少主机名");
        }
        return uri;
    }

    /**
     * SSRF 核心：把主机名解析成 IP，逐个拒绝内网/环回/链路本地/组播地址。
     * 注意这里要拦「解析结果里任一个是内网」，不能只看第一个 —— DNS 可能返回多 A 记录。
     */
    private void assertPublicHost(String host) {
        InetAddress[] addresses;
        try {
            addresses = InetAddress.getAllByName(host);
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "无法解析该地址的主机名");
        }
        if (addresses == null || addresses.length == 0) {
            throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "主机名解析结果为空");
        }
        for (InetAddress address : addresses) {
            if (address.isAnyLocalAddress()
                    || address.isLoopbackAddress()
                    || address.isLinkLocalAddress()
                    || address.isSiteLocalAddress()
                    || address.isMulticastAddress()) {
                // 0.0.0.0 / 127.x / 169.254.x / 10.x 172.16-31.x 192.168.x
                log.warn("拒绝转存内网地址 host={} resolved={}", host, address.getHostAddress());
                throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "不允许转存内网地址");
            }
        }
    }

    private byte[] download(URI uri, long maxBytes) {
        HttpURLConnection conn = null;
        try {
            URL url = uri.toURL();
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(TIMEOUT_MS);
            conn.setReadTimeout(TIMEOUT_MS);
            // 部分源站对空 Referer 直接 403，显式带 UA 比裸请求成功率高
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (compatible; MediaTransfer/1.0)");
            conn.setRequestProperty("Accept", "*/*");
            conn.setInstanceFollowRedirects(true);
            conn.setRequestMethod("GET");

            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) {
                throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(),
                        "源站返回 " + code + "，无法转存（可能存在防盗链或需要登录）");
            }
            long contentLength = conn.getContentLengthLong();
            if (contentLength > maxBytes) {
                throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(),
                        "远程文件超过大小上限（约 " + (maxBytes / 1024 / 1024) + "MB）");
            }
            try (InputStream in = conn.getInputStream()) {
                byte[] data = in.readNBytes((int) Math.min(maxBytes + 1, Integer.MAX_VALUE));
                if (data.length > maxBytes) {
                    throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "远程文件超过大小上限");
                }
                if (data.length == 0) {
                    throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "远程文件内容为空");
                }
                return data;
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("外链媒体下载失败 url={}: {}", uri, e.getMessage());
            throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    /** 系统配置 upload_max_size 与 50MB 取较小者；配置异常时退回 50MB */
    private long readConfiguredMaxSize() {
        try {
            String raw = systemConfigService.getConfigValue("upload_max_size", "");
            if (StringUtils.hasText(raw)) {
                long n = Long.parseLong(raw.trim());
                if (n > 0) {
                    return n;
                }
            }
        } catch (Exception e) {
            log.warn("读取 upload_max_size 失败，按 50MB 处理: {}", e.getMessage());
        }
        return MAX_BYTES;
    }

    private String extractExtension(String path) {
        if (!StringUtils.hasText(path)) return "";
        int slash = path.lastIndexOf('/');
        String name = slash >= 0 ? path.substring(slash + 1) : path;
        int dot = name.lastIndexOf('.');
        if (dot < 0 || dot == name.length() - 1) return "";
        String ext = name.substring(dot + 1);
        return ext.matches("(?i)^[A-Za-z0-9]{1,8}$") ? ext : "";
    }

    /** 源站文件名常带中文与特殊字符，直接拼进存储名会出问题，这里只保留安全的 ascii 片段 */
    private String buildFileName(String path, String ext) {
        String name = "remote";
        if (StringUtils.hasText(path)) {
            int slash = path.lastIndexOf('/');
            String raw = slash >= 0 ? path.substring(slash + 1) : path;
            int dot = raw.lastIndexOf('.');
            String base = dot > 0 ? raw.substring(0, dot) : raw;
            base = base.replaceAll("[^A-Za-z0-9_-]", "");
            if (base.length() >= 2 && base.length() <= 40) {
                name = base;
            }
        }
        return name + "." + ext.toLowerCase(Locale.ROOT);
    }
}
