package com.miniprogram.util;

import org.springframework.util.StringUtils;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 将上传资源 URL 规范为可公网访问的地址（纠正历史 localhost / 相对路径）。
 */
public final class PublicMediaUrl {

    private static final Pattern LOCAL_UPLOAD = Pattern.compile(
            "^https?://(?:localhost|127\\.0\\.0\\.1|\\d{1,3}(?:\\.\\d{1,3}){3})(?::\\d+)?(/uploads/.+)$",
            Pattern.CASE_INSENSITIVE);

    private PublicMediaUrl() {
    }

    public static String normalize(String raw, String fileBaseUrl) {
        if (!StringUtils.hasText(raw)) {
            return raw;
        }
        String value = raw.trim();
        String base = StringUtils.hasText(fileBaseUrl)
                ? fileBaseUrl.replaceAll("/+$", "")
                : "";

        Matcher local = LOCAL_UPLOAD.matcher(value);
        if (local.matches()) {
            return StringUtils.hasText(base) ? base + local.group(1) : local.group(1);
        }

        if (value.startsWith("/uploads/") && StringUtils.hasText(base)) {
            return base + value;
        }
        if (value.startsWith("uploads/") && StringUtils.hasText(base)) {
            return base + "/" + value;
        }
        return value;
    }
}
