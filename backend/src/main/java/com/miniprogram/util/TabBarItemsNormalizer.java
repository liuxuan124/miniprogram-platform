package com.miniprogram.util;

import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 底部导航草稿归一：稳定 id、tabRoute（壳页）、2~5 项。
 * 与 admin/src/utils/tabbar.ts、miniapp/utils/tabbar-config.js 语义对齐。
 */
public final class TabBarItemsNormalizer {

    private static final List<String> TAB_SHELL_ROUTES = List.of(
            "/pages/index/index",
            "/pages/discover/discover",
            "/pages/planet/planet",
            "/pages/shop/shop",
            "/pages/mine/mine"
    );

    private TabBarItemsNormalizer() {
    }

    public static List<Map<String, Object>> normalize(List<Map<String, Object>> raw) {
        if (raw == null || raw.isEmpty()) {
            return List.of();
        }
        List<Map<String, Object>> source = raw.size() > 5 ? raw.subList(0, 5) : raw;
        Set<String> usedRoutes = new LinkedHashSet<>();
        List<Map<String, Object>> out = new ArrayList<>();

        for (int index = 0; index < source.size(); index++) {
            Map<String, Object> tab = source.get(index);
            if (tab == null) {
                continue;
            }
            Map<String, Object> copy = new LinkedHashMap<>(tab);
            String tabRoute = resolveShellRoute(copy, index);
            if (usedRoutes.contains(tabRoute)) {
                tabRoute = firstFreeShell(usedRoutes).orElse(tabRoute);
            }
            usedRoutes.add(tabRoute);

            String id = firstText(copy.get("id"));
            if (!StringUtils.hasText(id)) {
                id = "tab-" + index;
            }
            copy.put("id", id);
            copy.put("tabRoute", tabRoute);

            String pagePath = firstText(copy.get("pagePath"), copy.get("path"));
            if (!StringUtils.hasText(pagePath)) {
                pagePath = tabRoute;
            } else if (!pagePath.startsWith("/")) {
                pagePath = "/" + pagePath;
            }
            copy.put("pagePath", pagePath.replaceFirst("^/+", ""));

            if (!copy.containsKey("text") || !StringUtils.hasText(String.valueOf(copy.get("text")))) {
                copy.put("text", "导航" + (index + 1));
            }
            out.add(copy);
        }
        return out;
    }

    private static String resolveShellRoute(Map<String, Object> tab, int index) {
        String raw = firstText(tab.get("tabRoute"), tab.get("slotRoute"));
        if (StringUtils.hasText(raw)) {
            String n = normalizePath(raw);
            if (TAB_SHELL_ROUTES.contains(n)) {
                return n;
            }
        }
        String path = normalizePath(firstText(tab.get("pagePath"), tab.get("path")));
        String text = firstText(tab.get("text"), tab.get("name"), tab.get("pageName"));
        String inferred = inferFromPathOrText(path, text);
        if (StringUtils.hasText(inferred)) {
            return inferred;
        }
        return TAB_SHELL_ROUTES.get(Math.min(index, TAB_SHELL_ROUTES.size() - 1));
    }

    private static String inferFromPathOrText(String path, String text) {
        if (path.contains("/pages/mine") || text.matches(".*(我的|mine).*")) {
            return "/pages/mine/mine";
        }
        if (path.contains("/pages/planet") || text.contains("星球")) {
            return "/pages/planet/planet";
        }
        if (path.contains("/pages/shop") || path.contains("knowledge-mall") || text.matches(".*(商品|商城).*")) {
            return "/pages/shop/shop";
        }
        if (path.contains("/pages/discover") || path.contains("content-list") || text.matches(".*(发现|内容|资讯).*")) {
            return "/pages/discover/discover";
        }
        if (path.contains("/pages/index") || text.matches(".*(首页|home).*")) {
            return "/pages/index/index";
        }
        return "";
    }

    private static java.util.Optional<String> firstFreeShell(Set<String> used) {
        for (String route : TAB_SHELL_ROUTES) {
            if (!used.contains(route)) {
                return java.util.Optional.of(route);
            }
        }
        return java.util.Optional.empty();
    }

    private static String normalizePath(String path) {
        if (!StringUtils.hasText(path)) {
            return "";
        }
        String p = path.trim();
        if (!p.startsWith("/")) {
            p = "/" + p;
        }
        return p.replaceAll("/+", "/");
    }

    private static String firstText(Object... values) {
        if (values == null) {
            return "";
        }
        for (Object v : values) {
            if (v == null) {
                continue;
            }
            String s = String.valueOf(v).trim();
            if (StringUtils.hasText(s)) {
                return s;
            }
        }
        return "";
    }
}
