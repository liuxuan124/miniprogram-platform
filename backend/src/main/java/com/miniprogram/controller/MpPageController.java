package com.miniprogram.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.R;
import com.miniprogram.entity.AnalyticsEvent;
import com.miniprogram.entity.Content;
import com.miniprogram.entity.MiniappRelease;
import com.miniprogram.entity.Product;
import com.miniprogram.mapper.AnalyticsEventMapper;
import com.miniprogram.mapper.ContentMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.MiniappReleaseService;
import com.miniprogram.service.PageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * 小程序端页面控制器
 *
 * 契约: GET /api/v1/mp/pages/{path}
 * path 为页面访问路径标识，如 home、promotion-2024 等
 * 同时支持查询参数方式: GET /api/v1/mp/pages?path=xxx
 */
@Slf4j
@Tag(name = "小程序-页面", description = "小程序获取页面配置")
@RestController
@RequestMapping("/api/v1/mp/pages")
@RequiredArgsConstructor
public class MpPageController {

    private final PageService pageService;
    private final MiniappReleaseService miniappReleaseService;
    private final ObjectMapper objectMapper;
    private final ProductMapper productMapper;
    private final ContentMapper contentMapper;
    private final AnalyticsEventMapper analyticsEventMapper;

    @Operation(summary = "个性化首页 DSL", description = "基于首页 DSL 注入近期行为/热门商品到 product_list、article_list")
    @GetMapping("/personalized-home")
    public R<Map<String, Object>> personalizedHome() {
        Map<String, Object> dsl = loadHomeDslMap();
        if (dsl == null) {
            throw new BusinessException(ErrorCode.PAGE_NOT_FOUND, "首页不存在或未发布");
        }
        List<Map<String, Object>> productItems = resolvePersonalizedProducts();
        List<Map<String, Object>> articleItems = resolvePersonalizedArticles();
        Object compsObj = dsl.get("components");
        if (compsObj instanceof List<?> comps) {
            for (Object c : comps) {
                if (!(c instanceof Map<?, ?> raw)) continue;
                @SuppressWarnings("unchecked")
                Map<String, Object> comp = (Map<String, Object>) raw;
                String type = Objects.toString(comp.get("type"), "");
                Object propsObj = comp.get("props");
                Map<String, Object> props;
                if (propsObj instanceof Map<?, ?> p) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> cast = (Map<String, Object>) p;
                    props = cast;
                } else {
                    props = new LinkedHashMap<>();
                    comp.put("props", props);
                }
                if ("product_list".equals(type) && !productItems.isEmpty()) {
                    props.put("items", productItems);
                    props.put("product_ids", productItems.stream().map(i -> i.get("id")).toList());
                    props.put("title", props.getOrDefault("title", "为你推荐"));
                }
                if (("article_list".equals(type) || "article_feed".equals(type)) && !articleItems.isEmpty()) {
                    props.put("items", articleItems);
                    props.put("title", props.getOrDefault("title", "猜你想看"));
                }
            }
        }
        dsl.put("personalized", true);
        return R.ok(dsl);
    }

    @Operation(summary = "获取页面配置（路径参数）", description = "小程序端根据 path 获取已发布页面的 DSL 配置")
    @GetMapping("/{path}")
    public R<Map<String, Object>> getPageConfigByPath(@PathVariable String path) {
        return resolvePageDsl(path);
    }

    @Operation(summary = "获取页面配置（查询参数）", description = "小程序端根据 path 参数获取已发布页面的 DSL 配置，适用于路径含斜杠的场景")
    @GetMapping
    public R<Map<String, Object>> getPageConfigByParam(@RequestParam String path) {
        return resolvePageDsl(path);
    }

    private Map<String, Object> loadHomeDslMap() {
        for (String path : List.of("pages/index/index", "/pages/index/index", "home")) {
            String dslContent = pageService.getPublishedPageDsl(path);
            if (dslContent == null) {
                dslContent = getPageDslFromLatestRelease(path);
            }
            if (dslContent == null) continue;
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> map = objectMapper.readValue(dslContent, Map.class);
                return map;
            } catch (Exception e) {
                log.warn("parse home dsl failed for {}: {}", path, e.getMessage());
            }
        }
        return null;
    }

    private List<Map<String, Object>> resolvePersonalizedProducts() {
        Long userId = null;
        try { userId = SecurityUtils.getCurrentUserId(); } catch (Exception ignored) {}
        LinkedHashSet<Long> ids = new LinkedHashSet<>();
        if (userId != null) {
            List<AnalyticsEvent> events = analyticsEventMapper.selectList(new LambdaQueryWrapper<AnalyticsEvent>()
                    .eq(AnalyticsEvent::getUserId, userId)
                    .ge(AnalyticsEvent::getCreateTime, LocalDateTime.now().minusDays(14))
                    .in(AnalyticsEvent::getEventName, List.of("product_view", "add_cart", "component_click", "order_create"))
                    .orderByDesc(AnalyticsEvent::getCreateTime)
                    .last("LIMIT 40"));
            for (AnalyticsEvent e : events) {
                Long pid = parseLong(e.getItemId());
                if (pid != null) ids.add(pid);
            }
        }
        List<Product> products = new ArrayList<>();
        for (Long id : ids) {
            if (products.size() >= 6) break;
            Product p = productMapper.selectById(id);
            if (p != null && "on_sale".equals(p.getStatus())) {
                products.add(p);
            }
        }
        if (products.size() < 6) {
            List<Product> top = productMapper.selectList(new LambdaQueryWrapper<Product>()
                    .eq(Product::getStatus, "on_sale")
                    .orderByDesc(Product::getSales)
                    .last("LIMIT 8"));
            for (Product p : top) {
                if (products.size() >= 6) break;
                boolean exists = products.stream().anyMatch(x -> Objects.equals(x.getId(), p.getId()));
                if (!exists) products.add(p);
            }
        }
        List<Map<String, Object>> items = new ArrayList<>();
        for (Product p : products) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("name", p.getName());
            m.put("title", p.getName());
            m.put("price", p.getPrice());
            m.put("mainImage", p.getMainImage());
            m.put("cover", p.getMainImage());
            m.put("image", p.getMainImage());
            items.add(m);
        }
        return items;
    }

    private List<Map<String, Object>> resolvePersonalizedArticles() {
        Long userId = null;
        try { userId = SecurityUtils.getCurrentUserId(); } catch (Exception ignored) {}
        LinkedHashSet<Long> ids = new LinkedHashSet<>();
        if (userId != null) {
            List<AnalyticsEvent> events = analyticsEventMapper.selectList(new LambdaQueryWrapper<AnalyticsEvent>()
                    .eq(AnalyticsEvent::getUserId, userId)
                    .ge(AnalyticsEvent::getCreateTime, LocalDateTime.now().minusDays(14))
                    .in(AnalyticsEvent::getEventName, List.of("content_view", "page_view", "component_click"))
                    .orderByDesc(AnalyticsEvent::getCreateTime)
                    .last("LIMIT 40"));
            for (AnalyticsEvent e : events) {
                Long cid = parseLong(e.getItemId());
                if (cid != null) ids.add(cid);
            }
        }
        List<Content> contents = new ArrayList<>();
        for (Long id : ids) {
            if (contents.size() >= 5) break;
            Content c = contentMapper.selectById(id);
            if (c != null && "published".equals(c.getStatus())) {
                contents.add(c);
            }
        }
        if (contents.size() < 5) {
            List<Content> top = contentMapper.selectList(new LambdaQueryWrapper<Content>()
                    .eq(Content::getStatus, "published")
                    .orderByDesc(Content::getViewCount)
                    .last("LIMIT 8"));
            for (Content c : top) {
                if (contents.size() >= 5) break;
                boolean exists = contents.stream().anyMatch(x -> Objects.equals(x.getId(), c.getId()));
                if (!exists) contents.add(c);
            }
        }
        List<Map<String, Object>> items = new ArrayList<>();
        for (Content c : contents) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", c.getId());
            m.put("title", c.getTitle());
            m.put("coverImage", c.getCoverImage());
            m.put("cover", c.getCoverImage());
            m.put("summary", c.getSummary());
            items.add(m);
        }
        return items;
    }

    private static Long parseLong(String s) {
        if (!StringUtils.hasText(s)) return null;
        try {
            return Long.parseLong(s.trim());
        } catch (Exception e) {
            return null;
        }
    }

    private R<Map<String, Object>> resolvePageDsl(String path) {
        if (!StringUtils.hasText(path)) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "path 不能为空");
        }
        String dslContent = pageService.getPublishedPageDsl(path);
        if (dslContent == null) {
            dslContent = getPageDslFromLatestRelease(path);
        }
        if (dslContent == null) {
            throw new BusinessException(ErrorCode.PAGE_NOT_FOUND, "页面不存在或未发布");
        }

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> dslMap = objectMapper.readValue(dslContent, Map.class);
            return R.ok(dslMap);
        } catch (Exception e) {
            return R.fail("页面配置解析失败");
        }
    }

    private String getPageDslFromLatestRelease(String path) {
        MiniappRelease release = miniappReleaseService.getLatestRelease();
        if (release == null || !StringUtils.hasText(release.getSnapshot())) {
            return null;
        }

        try {
            Map<String, Object> snapshot = objectMapper.readValue(
                    release.getSnapshot(),
                    new TypeReference<Map<String, Object>>() {}
            );
            Object pagesValue = snapshot.get("pages");
            if (!(pagesValue instanceof List<?> pages)) {
                return null;
            }

            String normalizedPath = normalizePath(path);
            for (Object item : pages) {
                if (!(item instanceof Map<?, ?> page)) {
                    continue;
                }
                String pagePath = Objects.toString(page.get("path"), "");
                if (normalizedPath.equals(normalizePath(pagePath))) {
                    return Objects.toString(page.get("dslContent"), null);
                }
            }
        } catch (Exception ignored) {
            return null;
        }
        return null;
    }

    private String normalizePath(String path) {
        if (path == null) {
            return "";
        }
        String normalized = path.trim();
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        return normalized;
    }
}
