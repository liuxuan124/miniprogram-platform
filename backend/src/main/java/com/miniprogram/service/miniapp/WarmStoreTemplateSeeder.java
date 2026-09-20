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
 * 系统预置整店模板种子（导航 + 壳页 DSL）。可选用/可复制，不是微信代码包。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WarmStoreTemplateSeeder {

    public static final String TEMPLATE_CODE = "warm";
    public static final String TEMPLATE_NAME = "暖阁整店";

    private final MiniappReleaseMapper miniappReleaseMapper;
    private final ObjectMapper objectMapper;

    /** 兼容旧调用：仅确保暖阁 */
    public void ensureWarmStoreTemplate() {
        ensureSystemStoreTemplates();
    }

    /** 启动/列表时补齐全部系统整店模板 */
    public void ensureSystemStoreTemplates() {
        for (StoreSeed seed : systemSeeds()) {
            ensureOne(seed);
        }
    }

    private void ensureOne(StoreSeed seed) {
        try {
            MiniappRelease existing = miniappReleaseMapper.selectOne(new LambdaQueryWrapper<MiniappRelease>()
                    .eq(MiniappRelease::getTemplateCode, seed.code())
                    .last("LIMIT 1"));
            if (existing != null) {
                boolean dirty = false;
                if (!Integer.valueOf(1).equals(existing.getIsSystem())) {
                    existing.setIsSystem(1);
                    dirty = true;
                }
                if (!"template".equals(existing.getMode())) {
                    existing.setMode("template");
                    dirty = true;
                }
                if (!StringUtils.hasText(existing.getTemplateName())) {
                    existing.setTemplateName(seed.name());
                    dirty = true;
                }
                if (dirty) {
                    miniappReleaseMapper.updateById(existing);
                }
                return;
            }

            String snapshot = objectMapper.writeValueAsString(seed.snapshot());
            String semver = nextSemver();
            String[] parts = semver.split("\\.");

            MiniappRelease release = new MiniappRelease();
            release.setSemver(semver);
            release.setMajor(Integer.parseInt(parts[0]));
            release.setMinor(Integer.parseInt(parts[1]));
            release.setPatch(Integer.parseInt(parts[2]));
            release.setChangeType("minor");
            release.setReleaseNotes(seed.notes());
            release.setTemplateName(seed.name());
            release.setTemplateCode(seed.code());
            release.setIsSystem(1);
            release.setSnapshot(snapshot);
            release.setPageCount(seed.pageCount());
            release.setStatus(0);
            release.setMode("template");
            release.setIsCurrent(0);
            miniappReleaseMapper.insert(release);
            log.info("已固化整店模板 code={} id={} semver={}", seed.code(), release.getId(), semver);
        } catch (Exception e) {
            log.warn("固化整店模板 {} 跳过: {}", seed.code(), e.getMessage());
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

    private List<StoreSeed> systemSeeds() {
        List<StoreSeed> list = new ArrayList<>();
        list.add(warmSeed());
        list.add(retailSeed());
        list.add(contentSeed());
        list.add(liteSeed());
        list.add(eduSeed());
        return list;
    }

    private StoreSeed warmSeed() {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        List<Map<String, Object>> pages = new ArrayList<>();
        pages.add(page("pages/index/index", "暖阁首页", "warm_home",
                Map.of("authors_title", "暖阁出品", "columns_title", "精品专栏", "planet_title", "我的星球"), "#FDF6EC"));
        pages.add(page("pages/discover/discover", "暖阁发现", "warm_discover", Map.of(), "#FDF6EC"));
        pages.add(page("pages/planet/planet", "暖阁星球", "warm_planet", Map.of("title", "暖阁星球"), "#FDF6EC"));
        pages.add(page("pages/shop/shop", "暖阁商城", "warm_shop", Map.of("title", "暖阁商城"), "#FDF6EC"));
        pages.add(page("pages/mine/mine", "暖阁我的", "warm_mine", Map.of(), "#FDF6EC"));
        snapshot.put("pages", pages);

        Map<String, Object> systemConfig = baseBrand("暖阁", "暖", "慢一点，也很好", "NUANGE",
                "#C2410C", "#EA580C", "#FDF6EC");
        systemConfig.put("tabbarItems", List.of(
                tab("tab-0", "首页", "/pages/index/index", "home"),
                tab("tab-1", "发现", "/pages/discover/discover", "content"),
                tab("tab-2", "星球", "/pages/planet/planet", "member"),
                tab("tab-3", "商城", "/pages/shop/shop", "shop"),
                tab("tab-4", "我的", "/pages/mine/mine", "mine")
        ));
        systemConfig.put("plugins", plugins(true, true, true, true, false));
        systemConfig.put("planet_config", Map.of(
                "title", "暖阁星球",
                "subtitle", "内容创作者的自留地",
                "unpaidViewMode", "summary",
                "previewCount", 3,
                "entryLabel", "星球"
        ));
        snapshot.put("systemConfig", systemConfig);
        snapshot.put("seed", "warm");
        snapshot.put("createdAt", "system-seed");
        return new StoreSeed("warm", "暖阁整店", 5,
                "系统预置：暖阁五 Tab（首页/发现/星球/商城/我的）。套用写入页面与外观并内容上线，不上传微信代码包。",
                snapshot);
    }

    private StoreSeed retailSeed() {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        List<Map<String, Object>> pages = new ArrayList<>();
        pages.add(page("pages/index/index", "零售首页", "warm_home",
                Map.of("authors_title", "品牌精选", "columns_title", "热卖专栏", "planet_title", "会员圈"), "#F6F8FB"));
        pages.add(page("pages/discover/discover", "分类发现", "warm_discover", Map.of(), "#F6F8FB"));
        pages.add(page("pages/shop/shop", "商城", "warm_shop", Map.of("title", "全部商品"), "#F6F8FB"));
        pages.add(page("pages/mine/mine", "我的", "warm_mine", Map.of(), "#F6F8FB"));
        snapshot.put("pages", pages);

        Map<String, Object> systemConfig = baseBrand("优选商城", "选", "好货不贵", "RETAIL",
                "#002FA7", "#20B7FF", "#F6F8FB");
        systemConfig.put("tabbarItems", List.of(
                tab("tab-0", "首页", "/pages/index/index", "home"),
                tab("tab-1", "发现", "/pages/discover/discover", "content"),
                tab("tab-2", "商城", "/pages/shop/shop", "shop"),
                tab("tab-3", "我的", "/pages/mine/mine", "mine")
        ));
        systemConfig.put("plugins", plugins(true, true, false, true, true));
        snapshot.put("systemConfig", systemConfig);
        snapshot.put("seed", "retail");
        snapshot.put("createdAt", "system-seed");
        return new StoreSeed("retail", "现代零售整店", 4,
                "系统预置：零售四 Tab（首页/发现/商城/我的），偏成交转化。套用为内容上线，非微信代码包。",
                snapshot);
    }

    private StoreSeed contentSeed() {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        List<Map<String, Object>> pages = new ArrayList<>();
        pages.add(page("pages/index/index", "内容首页", "warm_home",
                Map.of("authors_title", "创作者", "columns_title", "专栏", "planet_title", "社群"), "#FFF8F1"));
        pages.add(page("pages/discover/discover", "发现", "warm_discover", Map.of(), "#FFF8F1"));
        pages.add(page("pages/planet/planet", "社区", "warm_planet", Map.of("title", "内容社区"), "#FFF8F1"));
        pages.add(page("pages/mine/mine", "我的", "warm_mine", Map.of(), "#FFF8F1"));
        snapshot.put("pages", pages);

        Map<String, Object> systemConfig = baseBrand("内容站", "文", "深度内容与社群", "CONTENT",
                "#0F766E", "#14B8A6", "#FFF8F1");
        systemConfig.put("tabbarItems", List.of(
                tab("tab-0", "首页", "/pages/index/index", "home"),
                tab("tab-1", "发现", "/pages/discover/discover", "content"),
                tab("tab-2", "社区", "/pages/planet/planet", "member"),
                tab("tab-3", "我的", "/pages/mine/mine", "mine")
        ));
        systemConfig.put("plugins", plugins(false, true, true, true, false));
        systemConfig.put("planet_config", Map.of(
                "title", "内容社区",
                "subtitle", "讨论与连载",
                "entryLabel", "社区"
        ));
        snapshot.put("systemConfig", systemConfig);
        snapshot.put("seed", "content");
        snapshot.put("createdAt", "system-seed");
        return new StoreSeed("content", "内容社群整店", 4,
                "系统预置：内容四 Tab（首页/发现/社区/我的），弱化商城。套用为内容上线，非微信代码包。",
                snapshot);
    }

    private StoreSeed liteSeed() {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        List<Map<String, Object>> pages = new ArrayList<>();
        pages.add(page("pages/index/index", "首页", "warm_home",
                Map.of("authors_title", "推荐", "columns_title", "热卖", "planet_title", "圈子"), "#FFFFFF"));
        pages.add(page("pages/shop/shop", "商城", "warm_shop", Map.of("title", "全部商品"), "#FFFFFF"));
        pages.add(page("pages/mine/mine", "我的", "warm_mine", Map.of(), "#FFFFFF"));
        snapshot.put("pages", pages);

        Map<String, Object> systemConfig = baseBrand("轻量店", "轻", "简单好用", "LITE",
                "#334155", "#64748B", "#F8FAFC");
        systemConfig.put("tabbarItems", List.of(
                tab("tab-0", "首页", "/pages/index/index", "home"),
                tab("tab-1", "商城", "/pages/shop/shop", "shop"),
                tab("tab-2", "我的", "/pages/mine/mine", "mine")
        ));
        systemConfig.put("plugins", plugins(true, true, false, false, true));
        snapshot.put("systemConfig", systemConfig);
        snapshot.put("seed", "lite");
        snapshot.put("createdAt", "system-seed");
        return new StoreSeed("lite", "轻量三栏整店", 3,
                "系统预置：三 Tab（首页/商城/我的），适合快速开店。套用为内容上线，非微信代码包。",
                snapshot);
    }

    private StoreSeed eduSeed() {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        List<Map<String, Object>> pages = new ArrayList<>();
        pages.add(page("pages/index/index", "学堂首页", "warm_home",
                Map.of("authors_title", "名师", "columns_title", "精品课", "planet_title", "学习社群"), "#F0F9FF"));
        pages.add(page("pages/shop/shop", "课程商城", "warm_shop", Map.of("title", "全部课程"), "#F0F9FF"));
        pages.add(page("pages/discover/discover", "资料发现", "warm_discover", Map.of(), "#F0F9FF"));
        pages.add(page("pages/mine/mine", "我的学习", "warm_mine", Map.of(), "#F0F9FF"));
        snapshot.put("pages", pages);

        Map<String, Object> systemConfig = baseBrand("知识学堂", "学", "把知识变成能力", "EDU",
                "#1D4ED8", "#38BDF8", "#F0F9FF");
        systemConfig.put("tabbarItems", List.of(
                tab("tab-0", "首页", "/pages/index/index", "home"),
                tab("tab-1", "课程", "/pages/shop/shop", "shop"),
                tab("tab-2", "发现", "/pages/discover/discover", "content"),
                tab("tab-3", "我的", "/pages/mine/mine", "mine")
        ));
        systemConfig.put("plugins", plugins(true, true, true, true, false));
        snapshot.put("systemConfig", systemConfig);
        snapshot.put("seed", "edu");
        snapshot.put("createdAt", "system-seed");
        return new StoreSeed("edu", "知识付费整店", 4,
                "系统预置：学堂四 Tab（首页/课程/发现/我的）。套用为内容上线，非微信代码包。",
                snapshot);
    }

    private Map<String, Object> baseBrand(String appName, String mark, String tagline, String eyebrow,
                                          String primary, String secondary, String bg) {
        Map<String, Object> systemConfig = new LinkedHashMap<>();
        systemConfig.put("site_name", appName);
        systemConfig.put("miniappBrandConfig", Map.of(
                "appName", appName,
                "logoUrl", "",
                "logoMark", mark,
                "loginTagline", tagline,
                "brandEyebrow", eyebrow
        ));
        systemConfig.put("miniappThemeConfig", Map.of(
                "primaryColor", primary,
                "tabBarActiveColor", primary,
                "pageBgColor", bg,
                "secondaryColor", secondary
        ));
        return systemConfig;
    }

    private Map<String, Object> plugins(boolean product, boolean member, boolean planet,
                                        boolean content, boolean coupon) {
        Map<String, Object> plugins = new LinkedHashMap<>();
        plugins.put("product", product);
        plugins.put("member", member);
        plugins.put("planet", planet);
        plugins.put("order", true);
        plugins.put("content", content);
        plugins.put("comment", true);
        plugins.put("activity", true);
        plugins.put("form", false);
        plugins.put("qa", content);
        plugins.put("appointment", !planet);
        plugins.put("coupon", coupon);
        plugins.put("agent", content);
        return plugins;
    }

    private Map<String, Object> page(String path, String name, String type, Map<String, Object> props) {
        return page(path, name, type, props, "#FFFFFF");
    }

    private Map<String, Object> page(String path, String name, String type, Map<String, Object> props, String bg) {
        Map<String, Object> pageInfo = new LinkedHashMap<>();
        pageInfo.put("path", path);
        pageInfo.put("name", name);
        Map<String, Object> dsl = new LinkedHashMap<>();
        dsl.put("schema_version", "1.0");
        dsl.put("page", Map.of(
                "id", type + "_seed",
                "name", name,
                "type", path.contains("index") ? "home" : "custom",
                "path", path,
                "background_color", bg
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

    private Map<String, Object> tab(String id, String text, String path, String iconBase) {
        Map<String, Object> tab = new LinkedHashMap<>();
        tab.put("id", id);
        tab.put("text", text);
        tab.put("tabRoute", path);
        tab.put("pagePath", path);
        tab.put("enabled", true);
        tab.put("icon", "/images/tab/" + iconBase + ".png");
        tab.put("selectedIcon", "/images/tab/" + iconBase + "-active.png");
        return tab;
    }

    private record StoreSeed(String code, String name, int pageCount, String notes, Map<String, Object> snapshot) {
    }
}
