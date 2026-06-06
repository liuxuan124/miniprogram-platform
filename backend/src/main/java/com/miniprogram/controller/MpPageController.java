package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.entity.MiniappRelease;
import com.miniprogram.service.MiniappReleaseService;
import com.miniprogram.service.PageService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * 小程序端页面控制器
 *
 * 契约: GET /api/v1/mp/pages/{path}
 * path 为页面访问路径标识，如 home、promotion-2024 等
 * 同时支持查询参数方式: GET /api/v1/mp/pages?path=xxx
 */
@Tag(name = "小程序-页面", description = "小程序获取页面配置")
@RestController
@RequestMapping("/api/v1/mp/pages")
@RequiredArgsConstructor
public class MpPageController {

    private final PageService pageService;
    private final MiniappReleaseService miniappReleaseService;
    private final ObjectMapper objectMapper;

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

    private R<Map<String, Object>> resolvePageDsl(String path) {
        String dslContent = getPageDslFromLatestRelease(path);
        if (dslContent == null) {
            dslContent = pageService.getPublishedPageDsl(path);
        }
        if (dslContent == null) {
            return R.notFound("页面不存在或未发布");
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
