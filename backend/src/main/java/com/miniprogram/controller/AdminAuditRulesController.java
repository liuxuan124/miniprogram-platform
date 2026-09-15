package com.miniprogram.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.R;
import com.miniprogram.dto.system.ConfigBatchUpdateDTO;
import com.miniprogram.dto.system.ConfigItemDTO;
import com.miniprogram.service.SystemConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "管理端-审核规则")
@RestController
@RequestMapping("/api/v1/admin/audit")
@RequiredArgsConstructor
public class AdminAuditRulesController {

    private static final String CONFIG_KEY = "content_audit_rules";

    private final SystemConfigService systemConfigService;
    private final ObjectMapper objectMapper;

    @GetMapping("/rules")
    @Operation(summary = "内容审核规则（敏感词等）")
    @PreAuthorize("hasAuthority('content:audit') or hasAuthority('system:config')")
    public R<Map<String, Object>> getRules() {
        return R.ok(readMap());
    }

    @PutMapping("/rules")
    @Operation(summary = "保存审核规则")
    @PreAuthorize("hasAuthority('system:config') or hasAuthority('content:audit')")
    public R<Void> saveRules(@RequestBody Map<String, Object> body) {
        try {
            ConfigItemDTO item = new ConfigItemDTO();
            item.setConfigKey(CONFIG_KEY);
            item.setConfigValue(objectMapper.writeValueAsString(body != null ? body : Map.of()));
            item.setConfigGroup("basic");
            item.setDescription("内容审核规则");
            ConfigBatchUpdateDTO batch = new ConfigBatchUpdateDTO();
            batch.setConfigs(List.of(item));
            systemConfigService.batchUpdateConfigs(batch);
            return R.ok();
        } catch (Exception e) {
            throw new RuntimeException("保存失败: " + e.getMessage(), e);
        }
    }

    private Map<String, Object> readMap() {
        try {
            String raw = systemConfigService.getConfigValue(CONFIG_KEY);
            if (raw == null || raw.isBlank()) {
                Map<String, Object> defaults = new HashMap<>();
                defaults.put("sensitiveWords", "赌博,色情,暴力");
                defaults.put("autoBlockEnabled", true);
                defaults.put("note", "命中敏感词时标记为 auto_blocked，需在审核队列人工处理");
                return defaults;
            }
            return objectMapper.readValue(raw, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return new HashMap<>();
        }
    }
}
