package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.ContentAccessRuleDTO;
import com.miniprogram.entity.ContentAccessRule;
import com.miniprogram.entitlement.EntitlementEngine;
import com.miniprogram.service.ContentAccessRuleService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/contents/{contentId}/access-rule")
@RequiredArgsConstructor
public class ContentAccessRuleController {

    private final ContentAccessRuleService contentAccessRuleService;
    private final EntitlementEngine entitlementEngine;

    @GetMapping
    @PreAuthorize("hasAuthority('content:list')")
    @Operation(summary = "读取内容权限规则")
    public R<ContentAccessRule> get(@PathVariable Long contentId) {
        return R.ok(contentAccessRuleService.findByContentId(contentId));
    }

    @PutMapping
    @PreAuthorize("hasAuthority('content:update')")
    @Operation(summary = "保存内容权限规则")
    public R<Void> save(@PathVariable Long contentId, @RequestBody ContentAccessRuleDTO dto) {
        contentAccessRuleService.saveForContent(contentId, dto);
        entitlementEngine.invalidateUserCache(null);
        return R.ok();
    }
}
