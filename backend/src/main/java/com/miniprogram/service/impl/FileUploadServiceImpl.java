package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.dto.system.UploadResultVO;
import com.miniprogram.entity.Asset;
import com.miniprogram.mapper.AssetMapper;
import com.miniprogram.service.FileUploadService;
import com.miniprogram.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * 文件上传 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FileUploadServiceImpl implements FileUploadService {

    private final SystemConfigService systemConfigService;

    /**
     * 素材登记直接走 Mapper，不注入 AssetService —— AssetServiceImpl 反过来依赖
     * FileUploadService（微信公众号素材同步），双向注入会构成循环依赖。
     */
    private final AssetMapper assetMapper;

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    @Value("${file.base-url:http://localhost:8080}")
    private String baseUrl;

    @PostConstruct
    public void ensureUploadDir() {
        try {
            Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            if (!Files.isWritable(dir)) {
                log.error("上传目录不可写: {}（请检查 FILE_UPLOAD_DIR 权限）", dir);
            } else {
                log.info("上传目录就绪: {}", dir);
            }
        } catch (IOException e) {
            log.error("无法创建上传目录: {} — {}", uploadDir, e.getMessage(), e);
        }
    }

    /**
     * 允许的文件扩展名
     */
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "gif", "bmp", "webp",
            "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
            "txt", "md", "markdown", "csv",
            "zip", "rar", "mp4", "mp3"
    );

    /**
     * 默认最大文件大小 10MB
     */
    private static final long DEFAULT_MAX_SIZE = 10 * 1024 * 1024;

    /** 会被登记进素材库的媒体类型 */
    private static final Set<String> MEDIA_IMAGE_EXT = Set.of("jpg", "jpeg", "png", "gif", "bmp", "webp");
    private static final Set<String> MEDIA_VIDEO_EXT = Set.of("mp4");

    /**
     * 不进素材库的目录：受保护文档/文件库有自己的表，mp 与 avatar 是用户个人数据，
     * 混进运营素材库会干扰选图。
     */
    private static final Set<String> ASSET_EXCLUDED_PREFIX = Set.of("protected/", "mp", "avatar");

    @Override
    public UploadResultVO upload(MultipartFile file) {
        return upload(file, null);
    }

    @Override
    public UploadResultVO upload(MultipartFile file, String subDir) {
        // 校验文件
        validateFile(file);

        // 生成存储路径: {subDir}/{yyyy-MM-dd}/{uuid}.{ext}
        String originalFileName = file.getOriginalFilename();
        String ext = getExtension(originalFileName);
        if (!StringUtils.hasText(ext)) {
            ext = guessExtensionFromContentType(file.getContentType());
        }
        if (!StringUtils.hasText(ext)) {
            ext = "jpg";
        }
        if (!StringUtils.hasText(originalFileName) || !originalFileName.contains(".")) {
            originalFileName = (StringUtils.hasText(originalFileName) ? originalFileName : "avatar") + "." + ext;
        }
        return saveBytesToUploadDir(file, subDir, originalFileName, ext);
    }

    @Override
    public UploadResultVO uploadBytes(byte[] data, String originalFileName, String subDir) {
        if (data == null || data.length == 0) {
            throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
        }
        String ext = getExtension(originalFileName);
        if (!StringUtils.hasText(ext) || !ALLOWED_EXTENSIONS.contains(ext.toLowerCase())) {
            ext = "jpg";
            originalFileName = (StringUtils.hasText(originalFileName) ? originalFileName : "remote") + ".jpg";
        }
        String maxSizeStr = systemConfigService.getConfigValue("upload_max_size", String.valueOf(DEFAULT_MAX_SIZE));
        long maxSize;
        try {
            maxSize = Long.parseLong(maxSizeStr);
        } catch (NumberFormatException e) {
            maxSize = DEFAULT_MAX_SIZE;
        }
        if (data.length > maxSize) {
            throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
        }
        return saveBytesToUploadDir(data, subDir, originalFileName, ext);
    }

    private UploadResultVO saveBytesToUploadDir(MultipartFile file, String subDir, String originalFileName, String ext) {
        String relativePath = buildRelativePath(subDir, ext);
        try {
            Path filePath = Paths.get(uploadDir, relativePath);
            Files.createDirectories(filePath.getParent());
            Files.copy(file.getInputStream(), filePath);
            log.info("文件上传成功: {}", filePath);
        } catch (IOException e) {
            log.error("文件上传失败 uploadDir={} relativePath={}: {}", uploadDir, relativePath, e.getMessage(), e);
            throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
        }
        UploadResultVO result = buildUploadResult(originalFileName, relativePath, file.getSize(), file.getContentType());
        registerAsset(result, subDir, ext);
        return result;
    }

    private UploadResultVO saveBytesToUploadDir(byte[] data, String subDir, String originalFileName, String ext) {
        String relativePath = buildRelativePath(subDir, ext);
        try {
            Path filePath = Paths.get(uploadDir, relativePath);
            Files.createDirectories(filePath.getParent());
            Files.write(filePath, data);
            log.info("字节文件上传成功: {}", filePath);
        } catch (IOException e) {
            log.error("字节文件上传失败 uploadDir={} relativePath={}: {}", uploadDir, relativePath, e.getMessage(), e);
            throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
        }
        UploadResultVO result = buildUploadResult(originalFileName, relativePath, data.length, "application/octet-stream");
        registerAsset(result, subDir, ext);
        return result;
    }

    /**
     * 统一资产入口：任何入口上传的图片/视频，落盘成功后自动登记进素材库（mp_asset），
     * 供内容封面、装修页、商品图等各处引用。
     *
     * 按 url 幂等，重复上传同一地址不会重复登记；登记失败只记 warn，绝不阻断上传主流程。
     */
    private void registerAsset(UploadResultVO result, String subDir, String ext) {
        try {
            if (result == null || !StringUtils.hasText(result.getUrl())) return;
            if (!"true".equalsIgnoreCase(systemConfigService.getConfigValue("asset_auto_register", "true"))) return;

            String safeSub = StringUtils.hasText(subDir) ? subDir.trim().toLowerCase(Locale.ROOT) : "";
            for (String prefix : ASSET_EXCLUDED_PREFIX) {
                if (safeSub.startsWith(prefix)) return;
            }

            String e = StringUtils.hasText(ext) ? ext.toLowerCase(Locale.ROOT) : "";
            String type = null;
            if (MEDIA_IMAGE_EXT.contains(e)) type = "image";
            else if (MEDIA_VIDEO_EXT.contains(e)) type = "video";
            if (type == null) return;

            Long exists = assetMapper.selectCount(new LambdaQueryWrapper<Asset>().eq(Asset::getUrl, result.getUrl()));
            if (exists != null && exists > 0) return;

            Asset asset = new Asset();
            asset.setName(deriveAssetName(result.getOriginalFileName(), result.getFileName()));
            asset.setType(type);
            asset.setUrl(result.getUrl());
            asset.setThumbUrl("image".equals(type) ? result.getUrl() : null);
            asset.setSize(result.getFileSize() != null ? result.getFileSize() : 0L);
            asset.setCreatedAt(LocalDateTime.now());
            assetMapper.insert(asset);
            log.info("已自动登记素材库: {} ({})", asset.getName(), result.getUrl());
        } catch (Exception ex) {
            // 素材登记是附加能力，失败不能让上传失败
            log.warn("自动登记素材库失败（不影响上传结果）: {}", ex.getMessage());
        }
    }

    private String deriveAssetName(String originalFileName, String storedFileName) {
        String base = StringUtils.hasText(originalFileName) ? originalFileName : storedFileName;
        if (!StringUtils.hasText(base)) return "未命名素材";
        int slash = base.lastIndexOf('/');
        if (slash >= 0) base = base.substring(slash + 1);
        int dot = base.lastIndexOf('.');
        if (dot > 0) base = base.substring(0, dot);
        base = base.trim();
        return StringUtils.hasText(base) ? base : "未命名素材";
    }

    private String buildRelativePath(String subDir, String ext) {
        String datePath = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        String fileName = UUID.randomUUID().toString().replace("-", "") + "." + ext;
        String safeSub = sanitizeSubDir(subDir);
        if (StringUtils.hasText(safeSub)) {
            return safeSub + "/" + datePath + "/" + fileName;
        }
        return datePath + "/" + fileName;
    }

    private String sanitizeSubDir(String subDir) {
        if (!StringUtils.hasText(subDir)) return "";
        String s = subDir.trim().replace('\\', '/');
        if (s.contains("..") || s.startsWith("/") || !s.matches("^[a-zA-Z0-9_-]{1,32}$")) {
            throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "非法上传目录");
        }
        return s;
    }

    private UploadResultVO buildUploadResult(String originalFileName, String relativePath, long size, String contentType) {
        UploadResultVO result = new UploadResultVO();
        result.setFileName(relativePath.substring(relativePath.lastIndexOf('/') + 1));
        result.setOriginalFileName(originalFileName);
        result.setUrl(baseUrl + "/uploads/" + relativePath);
        result.setFileSize(size);
        result.setContentType(contentType);
        return result;
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
        }

        // 校验文件大小
        String maxSizeStr = systemConfigService.getConfigValue("upload_max_size", String.valueOf(DEFAULT_MAX_SIZE));
        long maxSize;
        try {
            maxSize = Long.parseLong(maxSizeStr);
        } catch (NumberFormatException e) {
            maxSize = DEFAULT_MAX_SIZE;
        }
        if (file.getSize() > maxSize) {
            throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
        }

        // 校验文件类型（微信 chooseAvatar 偶发无扩展名，按 Content-Type 兜底）
        String ext = getExtension(file.getOriginalFilename());
        if (!StringUtils.hasText(ext)) {
            ext = guessExtensionFromContentType(file.getContentType());
        }
        if (!StringUtils.hasText(ext) || !ALLOWED_EXTENSIONS.contains(ext.toLowerCase())) {
            throw new BusinessException(ErrorCode.FILE_TYPE_NOT_ALLOWED);
        }
    }

    private String guessExtensionFromContentType(String contentType) {
        if (!StringUtils.hasText(contentType)) {
            return "";
        }
        String ct = contentType.toLowerCase();
        if (ct.contains("jpeg") || ct.contains("jpg")) return "jpg";
        if (ct.contains("png")) return "png";
        if (ct.contains("gif")) return "gif";
        if (ct.contains("webp")) return "webp";
        if (ct.contains("bmp")) return "bmp";
        if (ct.startsWith("image/")) return "jpg";
        return "";
    }

    /**
     * 获取文件扩展名
     */
    private String getExtension(String fileName) {
        if (!StringUtils.hasText(fileName)) {
            return "";
        }
        int dotIndex = fileName.lastIndexOf(".");
        if (dotIndex < 0 || dotIndex == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(dotIndex + 1).toLowerCase();
    }
}
