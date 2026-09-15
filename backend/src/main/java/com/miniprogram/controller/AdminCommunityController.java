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

@Tag(name = "管理端-客服与社群")
@RestController
@RequestMapping("/api/v1/admin/community")
@RequiredArgsConstructor
public class AdminCommunityController {

    private static final String CONFIG_KEY = "community_config";

    private final SystemConfigService systemConfigService;
    private final ObjectMapper objectMapper;

    @GetMapping("/config")
    @Operation(summary = "客服与社群配置")
    @PreAuthorize("hasAuthority('system:config') or hasAuthority('user:list')")
    public R<Map<String, Object>> getConfig() {
        return R.ok(readMap());
    }

    @PutMapping("/config")
    @Operation(summary = "保存客服与社群配置")
    @PreAuthorize("hasAuthority('system:config')")
    public R<Void> saveConfig(@RequestBody Map<String, Object> body) {
        try {
            ConfigItemDTO item = new ConfigItemDTO();
            item.setConfigKey(CONFIG_KEY);
            item.setConfigValue(objectMapper.writeValueAsString(body != null ? body : Map.of()));
            item.setConfigGroup("basic");
            item.setDescription("客服与社群");
            ConfigBatchUpdateDTO batch = new ConfigBatchUpdateDTO();
            batch.setConfigs(List.of(item));
            systemConfigService.batchUpdateConfigs(batch);
            syncJoinGroupConfig(body != null ? body : Map.of());
            return R.ok();
        } catch (Exception e) {
            throw new RuntimeException("保存失败: " + e.getMessage(), e);
        }
    }

    /** 与历史 joinGroupConfig 双写，便于小程序 join 页联调 */
    private void syncJoinGroupConfig(Map<String, Object> body) {
        try {
            Map<String, Object> join = new HashMap<>();
            join.put("title", body.getOrDefault("joinTitle", "来加个微信吧\n有问题随时找得到人"));
            join.put("desc", body.getOrDefault("joinNotice", body.getOrDefault("onlineServiceHint", "")));
            join.put("memberCount", body.getOrDefault("memberCount", ""));
            Object groups = body.get("groups");
            if (groups != null) {
                join.put("groups", groups);
            }
            Object faqs = body.get("faqs");
            if (faqs != null) {
                join.put("faqs", faqs);
            }
            Map<String, Object> wecom = new HashMap<>();
            wecom.put("wecomUrl", body.get("wecomUrl"));
            wecom.put("wecomName", body.getOrDefault("wecomName", "企微客服"));
            join.put("wecomConfig", wecom);
            ConfigItemDTO legacy = new ConfigItemDTO();
            legacy.setConfigKey("joinGroupConfig");
            legacy.setConfigValue(objectMapper.writeValueAsString(join));
            legacy.setConfigGroup("basic");
            legacy.setDescription("加群页（由客服与社群同步）");
            ConfigBatchUpdateDTO batch = new ConfigBatchUpdateDTO();
            batch.setConfigs(List.of(legacy));
            systemConfigService.batchUpdateConfigs(batch);
        } catch (Exception ignored) {
            // 主配置已保存，同步失败不阻断
        }
    }

    private Map<String, Object> readMap() {
        try {
            String raw = systemConfigService.getConfigValue(CONFIG_KEY);
            if (raw == null || raw.isBlank()) {
                return new HashMap<>();
            }
            return objectMapper.readValue(raw, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return new HashMap<>();
        }
    }
}
