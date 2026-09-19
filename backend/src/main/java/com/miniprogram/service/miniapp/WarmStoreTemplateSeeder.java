package com.miniprogram.service.miniapp;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.entity.MiniappRelease;
import com.miniprogram.mapper.MiniappReleaseMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 固化「暖阁」整店模板种子：导航 + 五壳首页 DSL，可选用/可复制，不是微信代码包。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WarmStoreTemplateSeeder {

    public static final String TEMPLATE_CODE = "warm";
    public static final String TEMPLATE_NAME = "暖阁整店";

    private final MiniappReleaseMapper miniappReleaseMapper;
    private final ObjectMapper objectMapper;

    public void ensureWarmStoreTemplate() {
        try {
            MiniappRelease existing = miniappReleaseMapper.selectOne(new LambdaQueryWrapper<MiniappRelease>()
                    .eq(MiniappRelease::getTemplateCode, TEMPLATE_CODE)
                    .last("LIMIT 1"));
            if (existing != null) {
                if (!Integer.valueOf(1).equals(existing.getIsSystem())) {
                    existing.setIsSystem(1);
                    existing.setMode("template");
                    if (!StringUtils.hasText(existing.getTemplateName())) {
                        existing.setTemplateName(TEMPLATE_NAME);
                    }
                    miniappReleaseMapper.updateById(existing);
                }
                return;
            }

            String snapshot = objectMapper.writeValueAsString(buildWarmSnapshot());
            String semver = nextSemver();
            String[] parts = semver.split("\\.");

            MiniappRelease release = new MiniappRelease();
            release.setSemver(semver);
            release.setMajor(Integer.parseInt(parts[0]));
            release.setMinor(Integer.parseInt(parts[1]));
            release.setPatch(Integer.parseInt(parts[2]));
            release.setChangeType("minor");
            release.setReleaseNotes("系统预置：暖阁整店（五 Tab + 品牌导航）。选用后写入页面与外观并内容上线，不会上传微信代码包。");
            release.setTemplateName(TEMPLATE_NAME);
            release.setTemplateCode(TEMPLATE_CODE);
            release.setIsSystem(1);
            release.setSnapshot(snapshot);
            release.setPageCount(5);
            release.setStatus(0);
            release.setMode("template");
            release.setIsCurrent(0);
            miniappReleaseMapper.insert(release);
            log.info("已固化暖阁整店模板 id={} semver={}", release.getId(), semver);
        } catch (Exception e) {
            log.warn("固化暖阁整店模板跳过: {}", e.getMessage());
        }
    }

    private String nextSemver() {
        MiniappRelease latest = miniappReleaseMapper.selectOne(new LambdaQueryWrapper<MiniappRelease>()
                .orderByDesc(MiniappRelease::getMajor)
                .orderByDesc(MiniappRelease::getMinor)
                .orderByDesc(MiniappRelease::getPatch)
                .last("LIMIT 1"));
        if (latest == null) {
            return "1.0.0";
        }
        return latest.getMajor() + "." + latest.getMinor() + "." + (latest.getPatch() + 1);
    }

    private Map<String, Object> buildWarmSnapshot() {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        List<Map<String, Object>> pages = new ArrayList<>();
        pages.add(page("pages/index/index", "暖阁首页", "warm_home",
                Map.of("authors_title", "暖阁出品", "columns_title", "精品专栏", "planet_title", "我的星球")));
        pages.add(page("pages/discover/discover", "暖阁发现", "warm_discover", Map.of()));
        pages.add(page("pages/planet/planet", "暖阁星球", "warm_planet", Map.of("title", "暖阁星球")));
        pages.add(page("pages/shop/shop", "暖阁商城", "warm_shop", Map.of("title", "暖阁商城")));
        pages.add(page("pages/mine/mine", "暖阁我的", "warm_mine", Map.of()));
        snapshot.put("pages", pages);

        Map<String, Object> systemConfig = new LinkedHashMap<>();
        systemConfig.put("site_name", "暖阁");
        systemConfig.put("miniappBrandConfig", Map.of(
                "appName", "暖阁",
                "logoUrl", "",
                "logoMark", "暖",
                "loginTagline", "慢一点，也很好",
                "brandEyebrow", "NUANGE"
        ));
        systemConfig.put("miniappThemeConfig", Map.of(
                "primaryColor", "#C2410C",
                "tabBarActiveColor", "#C2410C",
                "pageBgColor", "#FDF6EC",
                "secondaryColor", "#EA580C"
        ));
        systemConfig.put("tabbarItems", List.of(
                tab("tab-0", "首页", "/pages/index/index"),
                tab("tab-1", "发现", "/pages/discover/discover"),
                tab("tab-2", "星球", "/pages/planet/planet"),
                tab("tab-3", "商城", "/pages/shop/shop"),
                tab("tab-4", "我的", "/pages/mine/mine")
        ));
        Map<String, Object> plugins = new LinkedHashMap<>();
        plugins.put("product", true);
        plugins.put("member", true);
        plugins.put("planet", true);
        plugins.put("order", true);
        plugins.put("content", true);
        plugins.put("comment", true);
        plugins.put("activity", true);
        plugins.put("form", false);
        plugins.put("qa", true);
        plugins.put("appointment", true);
        plugins.put("coupon", false);
        plugins.put("agent", true);
        systemConfig.put("plugins", plugins);
        systemConfig.put("planet_config", Map.of(
                "title", "暖阁星球",
                "subtitle", "内容创作者的自留地 · 由 墨白 主理",
                "coverImage", "",
                "unpaidViewMode", "summary",
                "previewCount", 3,
                "entryLabel", "星球"
        ));
        snapshot.put("systemConfig", systemConfig);
        snapshot.put("seed", "warm");
        snapshot.put("createdAt", "system-seed");
        return snapshot;
    }

    private Map<String, Object> page(String path, String name, String type, Map<String, Object> props) {
        Map<String, Object> pageInfo = new LinkedHashMap<>();
        pageInfo.put("path", path);
        pageInfo.put("name", name);
        Map<String, Object> dsl = new LinkedHashMap<>();
        dsl.put("schema_version", "1.0");
        dsl.put("page", Map.of(
                "id", "warm_" + type,
                "name", name,
                "type", path.contains("index") ? "home" : "custom",
                "path", path,
                "background_color", "#FDF6EC"
        ));
        dsl.put("components", List.of(Map.of(
                "id", type + "_1",
                "type", type,
                "props", props
        )));
        dsl.put("global_config", Map.of("pull_refresh", true, "reach_bottom_load", true));
        try {
            pageInfo.put("dslContent", objectMapper.writeValueAsString(dsl));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
        return pageInfo;
    }

    private Map<String, Object> tab(String id, String text, String path) {
        Map<String, Object> tab = new LinkedHashMap<>();
        tab.put("id", id);
        tab.put("text", text);
        tab.put("tabRoute", path);
        tab.put("pagePath", path);
        tab.put("enabled", true);
        String iconBase = switch (text) {
            case "首页" -> "home";
            case "发现" -> "content";
            case "星球" -> "member";
            case "商城" -> "shop";
            default -> "mine";
        };
        tab.put("icon", "/images/tab/" + iconBase + ".png");
        tab.put("selectedIcon", "/images/tab/" + iconBase + "-active.png");
        return tab;
    }
}
