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

    /** 后台「系统设置」里客服电话对应的扁平配置键，只读镜像（真相源 = CONFIG_KEY） */
    private static final String SERVICE_PHONE_KEY = "service_phone";

    private final SystemConfigService systemConfigService;
    private final ObjectMapper objectMapper;

    @GetMapping("/config")
    @Operation(summary = "客服与社群配置")
    @PreAuthorize("hasAuthority('system:config') or hasAuthority('user:list')")
    public R<Map<String, Object>> getConfig() {
        Map<String, Object> config = readMap();
        // 兼容历史：老数据只存了 service_phone，客服中心首次打开要能看到
        String phone = readServicePhone(config);
        if (phone == null) {
            phone = trimToNull(systemConfigService.getConfigValue(SERVICE_PHONE_KEY));
            if (phone != null) {
                config.put("phone", phone);
                config.put("servicePhone", phone);
            }
        }
        return R.ok(config);
    }

    @PutMapping("/config")
    @Operation(summary = "保存客服与社群配置")
    // 客服是运营日常动作（回消息、改电话），只读接口本来就放行 user:list，
    // 写接口却要 system:config（super_admin 专属）= 运营只能看不能改。
    // 这里放开给 user:list，与菜单「客服中心」的权限口径一致。
    @PreAuthorize("hasAuthority('system:config') or hasAuthority('user:list')")
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
            syncServicePhoneToLegalConfig(body != null ? body : Map.of());
            syncJoinGroupConfig(body != null ? body : Map.of());
            return R.ok();
        } catch (Exception e) {
            throw new RuntimeException("保存失败: " + e.getMessage(), e);
        }
    }

    /**
     * 客服电话是端上真正在读的字段（join 页 / 客服页都读 joinGroupConfig.servicePhone）。
     * 历史上后台「系统设置 → 法律协议与客服」把客服电话存在扁平键 service_phone
     * （见 admin/src/utils/system-config.ts 的 FORM_TO_DB_KEY.servicePhone），
     * 两处可改必然出现「配了没生效」。这里以 community_config 为唯一真相源，
     * 保存时回写 service_phone 保持向后兼容（旧读取方不至于读到脏值）。
     */
    private void syncServicePhoneToLegalConfig(Map<String, Object> body) {
        try {
            String phone = readServicePhone(body);
            if (phone == null) {
                return;
            }
            ConfigItemDTO item = new ConfigItemDTO();
            item.setConfigKey(SERVICE_PHONE_KEY);
            item.setConfigValue(phone);
            item.setConfigGroup("legal");
            item.setDescription("客服电话（由客服与社群配置同步，请勿在此单独修改）");
            ConfigBatchUpdateDTO batch = new ConfigBatchUpdateDTO();
            batch.setConfigs(List.of(item));
            systemConfigService.batchUpdateConfigs(batch);
        } catch (Exception ignored) {
            // 主配置已保存，同步失败不阻断
        }
    }

    /** 兼容三种字段名：phone（客服中心）/ servicePhone（系统设置）/ service_phone（端上历史） */
    private String readServicePhone(Map<String, Object> body) {
        for (String key : new String[]{"phone", "servicePhone", "service_phone"}) {
            String v = trimToNull(body.get(key));
            if (v != null) {
                return v;
            }
        }
        return null;
    }

    private String trimToNull(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    /**
     * 与历史 joinGroupConfig 双写，便于小程序 join 页联调。
     * ⚠️ 端上 join.js / service-chat.js 读的是**顶层** servicePhone / wecomUrl /
     * customerServiceCorpId / onlineServiceHint，这里必须平铺到顶层，
     * 只塞进 wecomConfig 子对象等于没配（历史遗留的「配了没生效」根因之一）。
     */
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
            Object avatars = body.get("avatars");
            if (avatars != null) {
                join.put("avatars", avatars);
            }
            Object ownerWay = body.get("ownerWay");
            if (ownerWay != null) {
                join.put("ownerWay", ownerWay);
            }
            Object wecomQr = body.get("wecomQr");
            if (wecomQr != null) {
                join.put("wecomQr", wecomQr);
            }
            // 客服三件套：电话 / 企微链接 / 在线说明，平铺到顶层供端上直读
            String servicePhone = readServicePhone(body);
            if (servicePhone != null) {
                join.put("servicePhone", servicePhone);
            }
            putIfPresent(join, "wecomUrl", firstPresent(body, "wecomUrl", "wecom", "wecom_url"));
            putIfPresent(join, "customerServiceUrl", firstPresent(body, "customerServiceUrl", "onlineUrl", "wecomUrl"));
            putIfPresent(join, "customerServiceCorpId", firstPresent(body, "customerServiceCorpId", "wecomCorpId"));
            putIfPresent(join, "onlineServiceHint", firstPresent(body, "onlineServiceHint", "desc"));
            putIfPresent(join, "groupRule", firstPresent(body, "rule", "groupRule", "joinRule"));
            Map<String, Object> wecom = new HashMap<>();
            wecom.put("wecomUrl", join.get("wecomUrl"));
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

    private Object firstPresent(Map<String, Object> body, String... keys) {
        for (String key : keys) {
            String v = trimToNull(body.get(key));
            if (v != null) {
                return v;
            }
        }
        return null;
    }

    private void putIfPresent(Map<String, Object> target, String key, Object value) {
        if (value != null) {
            target.put(key, value);
        }
    }

    /**
     * 读出 community_config 并做字段名归一：support.vue 存的是 phone/wecom/desc/rule，
     * 端上读的是 servicePhone/wecomUrl。两侧名字不同 → 后台改了端上读不到。
     */
    private Map<String, Object> readMap() {
        try {
            String raw = systemConfigService.getConfigValue(CONFIG_KEY);
            if (raw == null || raw.isBlank()) {
                return new HashMap<>();
            }
            Map<String, Object> map = objectMapper.readValue(raw, new TypeReference<Map<String, Object>>() {});
            return normalizeServiceFields(map);
        } catch (Exception e) {
            return new HashMap<>();
        }
    }

    private Map<String, Object> normalizeServiceFields(Map<String, Object> map) {
        putIfPresent(map, "servicePhone", firstPresent(map, "phone", "servicePhone", "service_phone"));
        putIfPresent(map, "wecomUrl", firstPresent(map, "wecom", "wecomUrl", "wecom_url"));
        putIfPresent(map, "desc", firstPresent(map, "desc", "onlineDesc", "description"));
        putIfPresent(map, "rule", firstPresent(map, "rule", "groupRule", "joinRule"));
        return map;
    }
}
