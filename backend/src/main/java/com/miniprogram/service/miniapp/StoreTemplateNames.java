package com.miniprogram.service.miniapp;

/**
 * 整店模板展示名：短中文、与微信版本号解耦。
 */
public final class StoreTemplateNames {

    public static final int MAX_LEN = 32;

    private StoreTemplateNames() {
    }

    public static String normalize(String raw) {
        if (raw == null) {
            return "";
        }
        String t = raw.trim().replaceAll("\\s+", " ");
        if (t.length() > MAX_LEN) {
            return t.substring(0, MAX_LEN);
        }
        return t;
    }

    public static String display(String name, String semver, String notes) {
        String n = normalize(name);
        if (!n.isEmpty()) {
            return n;
        }
        String note = notes == null ? "" : notes.trim();
        if (!note.isEmpty()) {
            return note.length() > MAX_LEN ? note.substring(0, MAX_LEN) : note;
        }
        if (semver != null && !semver.isBlank()) {
            return "版式 " + semver;
        }
        return "未命名模板";
    }

    public static String duplicateOf(String sourceDisplay) {
        String base = normalize(sourceDisplay);
        if (base.isEmpty()) {
            base = "模板";
        }
        String suffix = " 副本";
        if (base.length() + suffix.length() > MAX_LEN) {
            base = base.substring(0, MAX_LEN - suffix.length());
        }
        return base + suffix;
    }
}
