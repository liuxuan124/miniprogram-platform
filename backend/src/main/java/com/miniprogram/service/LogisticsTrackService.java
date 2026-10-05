package com.miniprogram.service;

import cn.hutool.http.HttpUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.entity.LogisticsTrackCache;
import com.miniprogram.mapper.LogisticsTrackCacheMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 物流轨迹查询（快递100）。
 *
 * <p><b>三层降级</b>，保证「查不到物流」永远不会让客服卡片空白：
 * <ol>
 *   <li>命中缓存（6 小时内）→ 直接返回</li>
 *   <li>调快递100 API 成功 → 写缓存</li>
 *   <li>未配置 Key / 请求失败 / 返回空 → 返回空列表，调用方合成一条「已发货」轨迹</li>
 * </ol>
 *
 * <p><b>为什么不每次都查</b>：快递100 免费版约 500 次/天，客服在对话里反复点同一单会瞬间打光配额。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LogisticsTrackService {

    private static final int HTTP_TIMEOUT_MS = 5000;
    private static final long CACHE_TTL_MINUTES = 360L; // 6 小时
    private static final String QUERY_URL = "https://www.kuaidi100.com/query";

    private final LogisticsTrackCacheMapper cacheMapper;
    private final SystemConfigService systemConfigService;
    private final ObjectMapper objectMapper;

    @Value("${app.logistics.kuaidi100.customer:}")
    private String customerFromEnv;

    /**
     * 查询轨迹。返回空列表表示「暂无数据」，调用方负责降级文案。
     *
     * @param expressName 快递公司名（中文，如「顺丰速运」）
     * @param trackingNo 运单号
     */
    public List<Map<String, String>> query(String expressName, String trackingNo) {
        if (!StringUtils.hasText(trackingNo)) {
            return List.of();
        }
        String no = trackingNo.trim();

        // ① 缓存
        List<Map<String, String>> cached = readCache(no);
        if (cached != null && !cached.isEmpty()) {
            return cached;
        }

        // ② 真实 API
        String customer = resolveCustomer();
        if (!StringUtils.hasText(customer)) {
            log.info("未配置快递100 customer，物流轨迹降级为发货提示 trackingNo={}", no);
            return List.of();
        }
        try {
            String url = QUERY_URL + "?type=" + java.net.URLEncoder.encode(
                    StringUtils.hasText(expressName) ? expressName : "auto", java.nio.charset.StandardCharsets.UTF_8)
                    + "&postid=" + java.net.URLEncoder.encode(no, java.nio.charset.StandardCharsets.UTF_8)
                    + "&customer=" + customer
                    + "&temp=" + System.currentTimeMillis();
            String resp = HttpUtil.get(url, HTTP_TIMEOUT_MS);
            List<Map<String, String>> tracks = parseKuaidi(resp);
            if (tracks.isEmpty()) {
                return List.of();
            }
            writeCache(no, expressName, tracks);
            return tracks;
        } catch (Exception e) {
            log.warn("快递100 查询失败 trackingNo={}: {}", no, e.getMessage());
            return List.of();
        }
    }

    /**
     * 解析快递100返回。data 是数组，每项含 {@code time} / {@code context} / {@code status}。
     * 快递100 的 data 可能整体是 JSON 字符串（双重编码），需二次解析。
     */
    private List<Map<String, String>> parseKuaidi(String resp) {
        List<Map<String, String>> out = new ArrayList<>();
        if (!StringUtils.hasText(resp)) {
            return out;
        }
        try {
            Map<String, Object> root = objectMapper.readValue(resp, new TypeReference<Map<String, Object>>() {});
            if (root == null) {
                return out;
            }
            Object status = root.get("status");
            // status != 200 或 message 非「ok」视为无数据
            if (status != null && !"200".equals(String.valueOf(status))) {
                return out;
            }
            Object data = root.get("data");
            // 双重编码：data 是 "[{...}]" 字符串
            if (data instanceof String s && StringUtils.hasText(s)) {
                data = objectMapper.readValue(s, new TypeReference<List<Object>>() {});
            }
            if (!(data instanceof List<?> list)) {
                return out;
            }
            for (Object item : list) {
                if (!(item instanceof Map<?, ?> m)) {
                    continue;
                }
                String context = str(m.get("context"));
                if (!StringUtils.hasText(context)) {
                    continue;
                }
                Map<String, String> t = new LinkedHashMap<>();
                t.put("time", normalizeTime(str(m.get("time"))));
                t.put("context", context.trim());
                out.add(t);
            }
            // 快递100 返回是倒序（最新在前），保持原序即可
        } catch (Exception e) {
            log.warn("解析快递100响应失败: {}", e.getMessage());
        }
        return out;
    }

    private String normalizeTime(String raw) {
        if (!StringUtils.hasText(raw)) {
            return "";
        }
        // 快递100 有时返回 "2026-10-06 10:00:00"，有时带毫秒，统一截断
        return raw.trim().replace("/", "-").substring(0, Math.min(19, raw.trim().length()));
    }

    // ==================== 缓存 ====================

    private List<Map<String, String>> readCache(String trackingNo) {
        try {
            LogisticsTrackCache row = cacheMapper.selectOne(new LambdaQueryWrapper<LogisticsTrackCache>()
                    .eq(LogisticsTrackCache::getTrackingNo, trackingNo).last("LIMIT 1"));
            if (row == null || !StringUtils.hasText(row.getTracks())) {
                return null;
            }
            if (row.getQueryTime() != null
                    && row.getQueryTime().isBefore(LocalDateTime.now().minusMinutes(CACHE_TTL_MINUTES))) {
                return null; // 过期，重查
            }
            return objectMapper.readValue(row.getTracks(), new TypeReference<List<Map<String, String>>>() {});
        } catch (Exception e) {
            log.warn("读取物流缓存失败 trackingNo={}: {}", trackingNo, e.getMessage());
            return null;
        }
    }

    private void writeCache(String trackingNo, String expressName, List<Map<String, String>> tracks) {
        try {
            LogisticsTrackCache row = new LogisticsTrackCache();
            row.setTrackingNo(trackingNo);
            row.setExpressCode(StringUtils.hasText(expressName) ? expressName : null);
            row.setTracks(objectMapper.writeValueAsString(tracks));
            row.setTrackCount(tracks.size());
            row.setLastTime(parseLocalDateTime(tracks.get(0).get("time")));
            row.setProvider("kuaidi100");
            row.setQueryTime(LocalDateTime.now());
            // 运单号唯一，用 upsert 语义先查后写（缓存表非业务表，无需严格并发）
            LogisticsTrackCache exists = cacheMapper.selectOne(new LambdaQueryWrapper<LogisticsTrackCache>()
                    .eq(LogisticsTrackCache::getTrackingNo, trackingNo).last("LIMIT 1"));
            if (exists == null) {
                cacheMapper.insert(row);
            } else {
                row.setId(exists.getId());
                cacheMapper.updateById(row);
            }
        } catch (Exception e) {
            log.warn("写入物流缓存失败 trackingNo={}: {}", trackingNo, e.getMessage());
        }
    }

    private LocalDateTime parseLocalDateTime(String time) {
        if (!StringUtils.hasText(time)) {
            return null;
        }
        try {
            return LocalDateTime.parse(time.length() > 16 ? time.substring(0, 16) : time, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
        } catch (Exception e) {
            return null;
        }
    }

    /** Key 优先读 system_config（后台可配），其次读环境变量。 */
    private String resolveCustomer() {
        try {
            String v = systemConfigService.getConfigValue("kuaidi100_customer");
            if (StringUtils.hasText(v)) {
                return v.trim();
            }
        } catch (Exception e) {
            log.debug("读取 system_config.kuaidi100_customer 失败: {}", e.getMessage());
        }
        return customerFromEnv;
    }

    private String str(Object v) {
        return v == null ? "" : String.valueOf(v);
    }
}
