package com.miniprogram.user;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * 小程序用户来源渠道编码与展示名
 */
public final class UserSourceChannels {

    public static final String SHARE = "share";
    public static final String SCAN = "scan";
    public static final String SEARCH = "search";
    public static final String AD = "ad";
    public static final String OTHER = "other";

    private static final Map<String, String> LABELS = new LinkedHashMap<>();

    static {
        LABELS.put(SHARE, "分享进入");
        LABELS.put(SCAN, "扫码进入");
        LABELS.put(SEARCH, "搜索进入");
        LABELS.put(AD, "广告进入");
        LABELS.put(OTHER, "其他");
    }

    private UserSourceChannels() {
    }

    public static String labelOf(String codeOrLabel) {
        if (codeOrLabel == null || codeOrLabel.isBlank()) {
            return "未知";
        }
        String raw = codeOrLabel.trim();
        String code = normalize(raw);
        return LABELS.getOrDefault(code, raw);
    }

    /** 将前端筛选值 / 历史中文 / 编码统一为标准编码 */
    public static String normalize(String raw) {
        if (raw == null || raw.isBlank()) {
            return OTHER;
        }
        String v = raw.trim().toLowerCase(Locale.ROOT);
        return switch (v) {
            case SHARE, "分享进入", "分享" -> SHARE;
            case SCAN, "扫码进入", "扫码" -> SCAN;
            case SEARCH, "搜索进入", "搜索" -> SEARCH;
            case AD, "广告进入", "广告" -> AD;
            case OTHER, "其他", "未知" -> OTHER;
            default -> v;
        };
    }

    /** 筛选时同时匹配编码与中文历史值 */
    public static List<String> filterValues(String raw) {
        String code = normalize(raw);
        List<String> values = new ArrayList<>();
        values.add(code);
        String label = LABELS.get(code);
        if (label != null) {
            values.add(label);
        }
        if (raw != null && !raw.isBlank() && !values.contains(raw.trim())) {
            values.add(raw.trim());
        }
        return values;
    }

    public static Map<String, String> allLabels() {
        return Map.copyOf(LABELS);
    }
}
