package com.miniprogram.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.R;
import com.miniprogram.dto.system.ConfigBatchUpdateDTO;
import com.miniprogram.dto.system.ConfigItemDTO;
import com.miniprogram.service.SystemConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

/**
 * 运营中心 › 搜索运营。
 *
 * <p>解决「热词硬编码在小程序 {@code data/warm-source.js} 里、运营改不了」的问题。
 * 端上读取链路<b>已存在</b>（{@code pages/search/search.js} 的 onLoad 会拉
 * {@code config.search_hot} 覆盖默认值），且 {@code search_hot} 已在
 * {@code PUBLIC_CONFIG_KEYS / JSON_CONFIG_KEYS / RUNTIME_PUBLIC_CONFIG_KEYS} 三处白名单里，
 * 所以<b>本模块不需要改小程序端、不需要新迁移</b>，只需要一个运营可操作的入口。
 *
 * <p><b>为什么不直接用 {@code /api/v1/admin/system/configs}：</b>
 * 该路径在 {@code SecurityConfig} 的 super_admin 专属前缀里（{@code /api/v1/admin/system/**}），
 * 运营角色（content_ops / biz_ops）调用会 403。本类走 {@code /api/v1/admin/ops/**}，
 * 该前缀不在专属名单内，只要求登录 —— 与私域引流模块的权限口径一致。
 *
 * <p>存储沿用 {@code mp_system_config} 的 JSON 惯例（同 {@code warm_home_config}、
 * {@code creator_recruit_banner}），故<b>无需 DDL 迁移</b>：
 * {@code SystemConfigServiceImpl.batchUpdateConfigs} 对不存在的 key 会自动创建。
 */
@Slf4j
@Tag(name = "运营中心-搜索运营")
@RestController
@RequestMapping("/api/v1/admin/ops/search")
@RequiredArgsConstructor
public class AdminSearchOpsController {

    /** 搜索热词配置键。与小程序 data/warm-source.js 的 SEARCH_HOT 兜底同义，但以本配置为准。 */
    public static final String KEY_SEARCH_HOT = "search_hot";

    /** 搜索页底部「建议入口」配置键：可配卡片，不配则端上用默认项。 */
    public static final String KEY_SEARCH_SUGGEST = "search_suggest";

    /** 单个词最大长度，与端上输入框限制对齐。 */
    private static final int MAX_WORD_LEN = 30;

    /** 最多允许配置的词数，超出截断（端上渲染也是列表，太多会挤屏）。 */
    private static final int MAX_WORDS = 20;

    /** 配置值（TEXT）容量上限留余量：65535 字节，这里按 8KB 卡，超长直接拒绝而不是静默截断。 */
    private static final int MAX_VALUE_LEN = 8 * 1024;

    private final SystemConfigService systemConfigService;
    private final ObjectMapper objectMapper;

    @Operation(summary = "取搜索热词列表")
    @GetMapping("/hot-words")
    public R<List<String>> hotWords() {
        return R.ok(readStringList(KEY_SEARCH_HOT));
    }

    @Operation(summary = "保存搜索热词列表")
    @PutMapping("/hot-words")
    public R<List<String>> saveHotWords(@RequestBody List<String> words) {
        List<String> normalized = normalize(words);
        if (normalized.isEmpty()) {
            // 传空数组 = 运营清空热词。此时写一个空数组而不是删 key：
            // 端上 `Array.isArray(hot) && hot.length` 判定不成立 → 自动回落到本地兜底词，
            // 语义正确（清空 = 用默认）。
            writeValue(KEY_SEARCH_HOT, "[]", "搜索热词（小程序搜索页展示）");
            return R.ok(List.of());
        }
        writeValue(KEY_SEARCH_HOT, toJson(normalized), "搜索热词（小程序搜索页展示）");
        return R.ok(normalized);
    }

    @Operation(summary = "取搜索建议位")
    @GetMapping("/suggests")
    public R<List<SuggestItem>> suggests() {
        return R.ok(readSuggests());
    }

    @Operation(summary = "保存搜索建议位")
    @PutMapping("/suggests")
    public R<List<SuggestItem>> saveSuggests(@RequestBody List<SuggestItem> items) {
        List<SuggestItem> safe = new ArrayList<>();
        if (items != null) {
            for (SuggestItem it : items) {
                if (it == null) {
                    continue;
                }
                String title = trim(it.title);
                if (title.isEmpty()) {
                    continue; // 标题空 = 无意义的卡片，直接丢
                }
                safe.add(new SuggestItem(it.icon, title, trim(it.desc), trim(it.path)));
            }
        }
        writeValue(KEY_SEARCH_SUGGEST, toJson(safe), "搜索建议位（小程序搜索页空态/无结果时的推荐入口）");
        return R.ok(safe);
    }

    // ==================== 内部方法 ====================

    /**
     * 归一化热词：去空白、剔空、截长度、去重、限数量。
     * 大小写不去重（搜索里「AI」与「ai」可能是不同意图）。
     */
    private List<String> normalize(List<String> raw) {
        List<String> out = new ArrayList<>();
        if (raw == null) {
            return out;
        }
        for (String s : raw) {
            String w = trim(s);
            if (w.isEmpty() || out.contains(w)) {
                continue;
            }
            if (w.length() > MAX_WORD_LEN) {
                w = w.substring(0, MAX_WORD_LEN);
            }
            out.add(w);
            if (out.size() >= MAX_WORDS) {
                break;
            }
        }
        return out;
    }

    private List<String> readStringList(String key) {
        String raw = systemConfigService.getConfigValue(key);
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        try {
            List<String> parsed = objectMapper.readValue(raw, new TypeReference<List<String>>() {});
            return parsed == null ? List.of() : normalize(parsed);
        } catch (Exception e) {
            // 配置写坏时不能连带 500 —— 运营页要能打开并看到兜底，而不是白屏
            log.warn("[搜索运营] 配置 {} 解析失败，返回空列表: {}", key, e.getMessage());
            return List.of();
        }
    }

    private List<SuggestItem> readSuggests() {
        String raw = systemConfigService.getConfigValue(KEY_SEARCH_SUGGEST);
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        try {
            List<SuggestItem> parsed = objectMapper.readValue(raw, new TypeReference<List<SuggestItem>>() {});
            return parsed == null ? List.of() : parsed;
        } catch (Exception e) {
            log.warn("[搜索运营] 配置 {} 解析失败，返回空列表: {}", KEY_SEARCH_SUGGEST, e.getMessage());
            return List.of();
        }
    }

    private void writeValue(String key, String json, String description) {
        if (json.length() > MAX_VALUE_LEN) {
            throw new IllegalArgumentException("配置内容过长（" + json.length() + " 字节），请减少条目后重试");
        }
        ConfigItemDTO item = new ConfigItemDTO();
        item.setConfigKey(key);
        item.setConfigValue(json);
        item.setConfigGroup("ops");
        item.setDescription(description);
        ConfigBatchUpdateDTO dto = new ConfigBatchUpdateDTO();
        dto.setConfigs(java.util.Collections.singletonList(item));
        // key 不存在时 batchUpdateConfigs 会自动创建，因此本模块不需要 DDL 迁移
        systemConfigService.batchUpdateConfigs(dto);
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("配置序列化失败", e);
        }
    }

    private static String trim(String s) {
        return s == null ? "" : s.trim();
    }

    /** 搜索建议位条目。path 为小程序内部路由，走 render.js 的 navigatePage 兜底。 */
    public static class SuggestItem {
        public String icon;
        public String title;
        public String desc;
        public String path;

        public SuggestItem() {
        }

        public SuggestItem(String icon, String title, String desc, String path) {
            this.icon = icon;
            this.title = title;
            this.desc = desc;
            this.path = path;
        }

        public String getIcon() {
            return icon;
        }

        public void setIcon(String icon) {
            this.icon = icon;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getDesc() {
            return desc;
        }

        public void setDesc(String desc) {
            this.desc = desc;
        }

        public String getPath() {
            return path;
        }

        public void setPath(String path) {
            this.path = path;
        }
    }
}
