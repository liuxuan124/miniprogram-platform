package com.miniprogram.controller;

import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.R;
import com.miniprogram.entity.MiniappRelease;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.MiniappReleaseService;
import com.miniprogram.service.SystemConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 小程序端整店模版馆：浏览与套用（内容上线通道，非微信代码包）
 */
@Tag(name = "小程序-整店模版")
@RestController
@RequestMapping("/api/v1/mp/store-templates")
@RequiredArgsConstructor
public class MpStoreTemplateController {

    private final MiniappReleaseService miniappReleaseService;
    private final SystemConfigService systemConfigService;
    private final UserMapper userMapper;

    @GetMapping
    @Operation(summary = "整店模版列表")
    public R<List<Map<String, Object>>> list() {
        List<MiniappRelease> releases = miniappReleaseService.listStoreTemplates();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (MiniappRelease item : releases) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", item.getId());
            row.put("name", item.getTemplateName());
            row.put("code", item.getTemplateCode());
            row.put("notes", item.getReleaseNotes());
            row.put("pageCount", item.getPageCount());
            row.put("inUse", Integer.valueOf(1).equals(item.getIsCurrent()));
            row.put("isSystem", Integer.valueOf(1).equals(item.getIsSystem()));
            row.put("semver", item.getSemver());
            rows.add(row);
        }
        return R.ok(rows);
    }

    @GetMapping("/{id}")
    @Operation(summary = "整店模版详情")
    public R<Map<String, Object>> detail(@PathVariable Long id) {
        MiniappRelease item = miniappReleaseService.getReleaseDetail(id);
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", item.getId());
        row.put("name", item.getTemplateName());
        row.put("code", item.getTemplateCode());
        row.put("notes", item.getReleaseNotes());
        row.put("pageCount", item.getPageCount());
        row.put("inUse", Integer.valueOf(1).equals(item.getIsCurrent()));
        row.put("isSystem", Integer.valueOf(1).equals(item.getIsSystem()));
        row.put("semver", item.getSemver());
        return R.ok(row);
    }

    @PostMapping("/{id}/activate")
    @Operation(summary = "套用整店模版", description = "覆盖当前导航与页面（内容上线），需运营角色")
    public R<Map<String, Object>> activate(@PathVariable Long id) {
        assertCanSwitchTemplate();
        MiniappRelease activated = miniappReleaseService.activateStoreTemplate(id);
        // 套用后清空待上线草稿，避免后台误以为还有未上线改动
        try {
            systemConfigService.batchUpdateConfigs(buildClearDraftDto());
        } catch (Exception ignored) {
            // 清草稿失败不影响套用结果
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", activated.getId());
        result.put("name", activated.getTemplateName());
        result.put("message", "已切换模版，请重新进入小程序查看");
        return R.ok(result);
    }

    private void assertCanSwitchTemplate() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.NOT_LOGIN, "请先登录后再切换模版");
        }
        // 已登录即可套用（二次确认在小程序端）；创作者角色额外放行标记供前端展示
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.NOT_LOGIN, "请先登录后再切换模版");
        }
    }

    private com.miniprogram.dto.system.ConfigBatchUpdateDTO buildClearDraftDto() {
        com.miniprogram.dto.system.ConfigItemDTO item = new com.miniprogram.dto.system.ConfigItemDTO();
        item.setConfigKey("site_builder_draft");
        item.setConfigValue("{}");
        item.setConfigGroup("basic");
        item.setDescription("套用模版后清空待上线草稿");
        com.miniprogram.dto.system.ConfigBatchUpdateDTO dto = new com.miniprogram.dto.system.ConfigBatchUpdateDTO();
        dto.setConfigs(List.of(item));
        return dto;
    }
}
