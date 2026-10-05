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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 运营中心 › 全局资源位。
 *
 * <p>解决「运营想上新公告 / 弹窗 / 浮层，但没有统一入口、只能进装修器逐页手改」的问题。
 *
 * <p><b>存储</b>：沿用 {@code mp_system_config} 的 JSON 惯例（同 {@code warm_home_config}、
 * {@code joinGroupConfig}），<b>无需 DDL 迁移</b> —— {@code batchUpdateConfigs} 对不存在的 key 会自动创建。
 *
 * <p><b>⚠️ 三处白名单必须同步加</b>（漏任何一处都会静默失效或以字符串下发）：
 * <ol>
 *   <li>{@code PUBLIC_CONFIG_KEYS} —— 不加则<b>整个 key 不会出现在小程序响应里</b></li>
 *   <li>{@code JSON_CONFIG_KEYS} —— 不加则值以<b>字符串</b>下发，端上 {@code cfg.xxx} 恒 undefined 且不报错</li>
 *   <li>{@code RUNTIME_PUBLIC_CONFIG_KEYS} —— 不加则「已上线」的系统配置不生效（只有线上配置生效）</li>
 * </ol>
 *
 * <p><b>为什么不走 {@code /api/v1/admin/system/configs}</b>：该路径在 {@code SecurityConfig} 的
 * super_admin 专属前缀里，运营角色（content_ops / biz_ops）调用会 403。本类走
 * {@code /api/v1/admin/ops/**}，只需登录 —— 与私域引流 / 搜索运营 / 审核中心同一口径。
 */
@Slf4j
@Tag(name = "运营中心-全局资源位")
@RestController
@RequestMapping("/api/v1/admin/ops/resource")
@RequiredArgsConstructor
public class AdminResourceOpsController {

    /** 全局资源位配置键（JSON）。 */
    public static final String KEY_RESOURCE_SLOTS = "global_resource_slots";

    /** 单一资源位类型上限，防止运营把配置撑爆 TEXT 列（8KB）。 */
    private static final int MAX_SLOTS = 20;

    /** 标题最大长度。 */
    private static final int MAX_TITLE = 40;

    /** 正文最大长度。 */
    private static final int MAX_BODY = 300;

    /** 允许的类型白名单：popup 弹窗 / bar 顶部横条 / float 悬浮球 / bulletin 公告。 */
    private static final List<String> ALLOWED_TYPES =
            List.of("popup", "bar", "float", "bulletin");

    private final SystemConfigService systemConfigService;
    private final ObjectMapper objectMapper;

    // ────────────────────────────读 ────────────────────────────

    @Operation(summary = "读取全局资源位列表")
    @GetMapping("/slots")
    public R<List<Map<String, Object>>> listSlots() {
        return R.ok(loadSlots());
    }

    @Operation(summary = "资源位类型枚举与约束（前端表单用）")
    @GetMapping("/meta")
    public R<Map<String, Object>> meta() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("types", ALLOWED_TYPES);
        m.put("maxSlots", MAX_SLOTS);
        m.put("maxTitle", MAX_TITLE);
        m.put("maxBody", MAX_BODY);
        // 每种类型的展示名与说明，避免前端硬编码
        List<Map<String, String>> typeDesc = new ArrayList<>();
        typeDesc.add(desc("popup", "弹窗", "居中模态，可关闭；同类型同时只展示优先级最高的一条"));
        typeDesc.add(desc("bar", "顶部横条", "页面顶部通栏，可关闭；常驻直到用户关掉或到期"));
        typeDesc.add(desc("float", "悬浮球", "右下角常驻小图标，点击展开；不遮挡内容"));
        typeDesc.add(desc("bulletin", "公告", "顶部细条滚动文案，轻量不打断；适合短期活动"));
        m.put("typeDesc", typeDesc);
        return R.ok(m);
    }

    // ──────────────────────────── 写 ────────────────────────────

    @Operation(summary = "保存全局资源位（整表覆盖）")
    @PutMapping("/slots")
    public R<List<Map<String, Object>>> saveSlots(@RequestBody List<Map<String, Object>> body) {
        List<Map<String, Object>> normalized = normalize(body);

        // 整表覆盖：把归一化结果写回配置键
        ConfigItemDTO item = new ConfigItemDTO();
        item.setConfigKey(KEY_RESOURCE_SLOTS);
        item.setConfigValue(writeJson(normalized));
        ConfigBatchUpdateDTO dto = new ConfigBatchUpdateDTO();
        dto.setConfigs(List.of(item));
        systemConfigService.batchUpdateConfigs(dto);

        return R.ok(loadSlots());
    }

    // ──────────────────────────── 内部 ────────────────────────────

    private static Map<String, String> desc(String type, String name, String note) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("type", type);
        m.put("label", name);
        m.put("note", note);
        return m;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> loadSlots() {
        String raw = systemConfigService.getConfigValue(KEY_RESOURCE_SLOTS);
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        try {
            List<Map<String, Object>> list =
                    objectMapper.readValue(raw, new TypeReference<List<Map<String, Object>>>() {});
            return list == null ? List.of() : list;
        } catch (Exception e) {
            // 解析失败降级为空列表，不 500 —— 配置坏了不该让后台打不开
            log.warn("解析 {} 失败，返回空列表", KEY_RESOURCE_SLOTS, e);
            return List.of();
        }
    }

    /**
     * 归一化：过滤非法类型、截断超长文案、补默认值、按 priority 排序（大的优先）。
     * <p>目的是让「运营手抖」不会写出让端上崩掉的数据。
     */
    private List<Map<String, Object>> normalize(List<Map<String, Object>> input) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (input == null || input.isEmpty()) {
            return out;
        }
        for (Map<String, Object> raw : input) {
            if (raw == null) {
                continue;
            }
            String type = str(raw.get("type"));
            if (!ALLOWED_TYPES.contains(type)) {
                log.debug("忽略非法资源位类型: {}", type);
                continue;
            }
            String title = truncate(str(raw.get("title")), MAX_TITLE);
            String body = truncate(str(raw.get("body")), MAX_BODY);
            if (title.isEmpty() && body.isEmpty()) {
                // 标题正文都空的等于没配，跳过
                continue;
            }
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("type", type);
            m.put("title", title);
            m.put("body", body);
            m.put("link", truncate(str(raw.get("link")), 200));
            m.put("image", truncate(str(raw.get("image")), 300));
            m.put("enabled", bool(raw.get("enabled"), true));
            m.put("priority", num(raw.get("priority"), 0));
            // 生效窗口；空串表示「立即生效、不限」
            m.put("startAt", truncate(str(raw.get("startAt")), 32));
            m.put("endAt", truncate(str(raw.get("endAt")), 32));
            // 同用户每天最多弹 N 次（0 = 不限），防骚扰
            m.put("dailyLimit", num(raw.get("dailyLimit"), 1));
            out.add(m);
            if (out.size() >= MAX_SLOTS) {
                log.info("资源位超过上限 {}，其余已丢弃", MAX_SLOTS);
                break;
            }
        }
        // priority 大的在前；相同则保持原顺序（稳定）
        out.sort((a, b) -> Integer.compare(
                (int) num(b.get("priority"), 0), (int) num(a.get("priority"), 0)));
        return out;
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalArgumentException("序列化资源位配置失败", e);
        }
    }

    private static String str(Object v) {
        return v == null ? "" : String.valueOf(v).trim();
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max);
    }

    private static boolean bool(Object v, boolean def) {
        if (v == null) {
            return def;
        }
        if (v instanceof Boolean b) {
            return b;
        }
        String s = String.valueOf(v).trim();
        return s.isEmpty() ? def : ("1".equals(s) || "true".equalsIgnoreCase(s));
    }

    private static long num(Object v, long def) {
        if (v instanceof Number n) {
            return n.longValue();
        }
        try {
            return v == null ? def : Long.parseLong(String.valueOf(v).trim());
        } catch (NumberFormatException e) {
            return def;
        }
    }
}