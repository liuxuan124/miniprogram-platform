package com.miniprogram.util;

import org.springframework.util.StringUtils;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 将上传资源 URL 规范为可公网访问的地址（纠正历史 localhost / 相对路径 / 临时路径）。
 */
public final class PublicMediaUrl {

    private static final Pattern LOCAL_UPLOAD = Pattern.compile(
            "^https?://(?:localhost|127\\.0\\.0\\.1|\\d{1,3}(?:\\.\\d{1,3}){3})(?::\\d+)?(/uploads/.+)$",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern EPHEMERAL = Pattern.compile(
            "^(?:wxfile:|http://tmp/)",
            Pattern.CASE_INSENSITIVE);

    private PublicMediaUrl() {
    }

    /** 微信临时路径等不可持久化、不可跨端展示的地址 */
    public static boolean isEphemeralClientPath(String raw) {
        if (!StringUtils.hasText(raw)) {
            return false;
        }
        return EPHEMERAL.matcher(raw.trim()).find();
    }

    /**
     * 写入 DB 前规范化；临时路径直接拒绝（返回 null）。
     * 相对路径 avatar/... → /uploads/avatar/...，再拼 fileBaseUrl。
     */
    public static String sanitizeForPersist(String raw, String fileBaseUrl) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        String value = raw.trim();
        if (isEphemeralClientPath(value)) {
            return null;
        }
        String normalized = normalize(value, fileBaseUrl);
        if (!StringUtils.hasText(normalized) || isEphemeralClientPath(normalized)) {
            return null;
        }
        return normalized;
    }

    public static String normalize(String raw, String fileBaseUrl) {
        if (!StringUtils.hasText(raw)) {
            return raw;
        }
        String value = raw.trim();
        if (isEphemeralClientPath(value)) {
            return null;
        }

        String base = StringUtils.hasText(fileBaseUrl)
                ? fileBaseUrl.replaceAll("/+$", "")
                : "";

        Matcher local = LOCAL_UPLOAD.matcher(value);
        if (local.matches()) {
            return StringUtils.hasText(base) ? base + local.group(1) : local.group(1);
        }

        String uploadPath = toUploadPath(value);
        if (uploadPath != null) {
            return StringUtils.hasText(base) ? base + uploadPath : uploadPath;
        }

        return value;
    }

    /**
     * @return 以 /uploads/ 开头的路径，或无法识别时返回 null
     */
    static String toUploadPath(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String v = value.trim().replace('\\', '/');
        if (v.startsWith("/uploads/")) {
            return v;
        }
        if (v.startsWith("uploads/")) {
            return "/" + v;
        }
        // 历史脏数据：avatar/yyyy-MM-dd/xxx.jpeg（缺 /uploads/ 前缀）
        if (v.startsWith("avatar/") || v.startsWith("/avatar/")) {
            String rest = v.startsWith("/") ? v.substring(1) : v;
            return "/uploads/" + rest;
        }
        return null;
    }
}
