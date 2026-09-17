package com.miniprogram.service.pageai;

import java.util.Locale;
import java.util.regex.Pattern;

final class MpEndpointPaths {

    private static final Pattern PATH_VAR = Pattern.compile("\\{[^/}]+}");

    private MpEndpointPaths() {
    }

    static String normalize(String path) {
        if (path == null) {
            return "";
        }
        String p = PATH_VAR.matcher(path.trim()).replaceAll("{id}");
        if (!p.startsWith("/")) {
            p = "/" + p;
        }
        if (p.endsWith("/") && p.length() > 1) {
            p = p.substring(0, p.length() - 1);
        }
        return p.toLowerCase(Locale.ROOT);
    }

    static boolean matches(String requiredPath, Iterable<String> registered) {
        if (requiredPath == null || requiredPath.isBlank()) {
            return true;
        }
        String want = normalize(requiredPath);
        for (String raw : registered) {
            String have = normalize(raw);
            if (have.equals(want) || have.startsWith(want + "/") || want.startsWith(have + "/")) {
                return true;
            }
        }
        return false;
    }
}
