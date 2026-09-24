package com.miniprogram.entitlement;

import org.springframework.util.StringUtils;

/**
 * 按可见字符比例裁切 HTML 正文（服务端试读，非安全加密）。
 */
public final class ContentBodyTruncator {

    private ContentBodyTruncator() {
    }

    public static String truncateHtml(String html, int percent) {
        if (!StringUtils.hasText(html)) {
            return html;
        }
        int p = Math.max(0, Math.min(100, percent));
        if (p >= 100) {
            return html;
        }
        if (p <= 0) {
            return "";
        }
        String plain = html.replaceAll("<[^>]+>", "");
        int keep = Math.max(1, plain.length() * p / 100);
        if (keep >= plain.length()) {
            return html;
        }
        String snippet = plain.substring(0, keep);
        return "<div class=\"preview-truncated\">" + escape(snippet) + "…</div>";
    }

    private static String escape(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
