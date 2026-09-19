package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.member.MembershipPlanDTO;
import com.miniprogram.dto.member.MembershipPlanVO;
import com.miniprogram.service.MembershipPlanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 后台-付费会员档管理（平台 / 星球）
 */
@RestController
@RequestMapping("/api/v1/admin/membership-plans")
@RequiredArgsConstructor
@Tag(name = "后台-付费会员档")
public class AdminMembershipPlanController {

    private final MembershipPlanService membershipPlanService;
    private final com.miniprogram.service.MemberExpireRemindService memberExpireRemindService;

    @GetMapping
    @PreAuthorize("hasAuthority('member:list')")
    @Operation(summary = "付费会员档列表")
    public R<List<MembershipPlanVO>> list(
            @RequestParam(required = false) String scope,
            @RequestParam(required = false) String planetId) {
        return R.ok(membershipPlanService.listPlans(scope, planetId));
    }

    @PostMapping("/expire-remind/trial")
    @PreAuthorize("hasAuthority('member:update')")
    @Operation(summary = "手动试发会员到期提醒（入队订阅消息）")
    public R<java.util.Map<String, Object>> trialExpireRemind() {
        return R.ok(memberExpireRemindService.runManualTrial());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('member:update')")
    @Operation(summary = "创建付费会员档")
    public R<MembershipPlanVO> create(@Valid @RequestBody MembershipPlanDTO dto) {
        return R.ok(membershipPlanService.createPlan(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('member:update')")
    @Operation(summary = "更新付费会员档")
    public R<MembershipPlanVO> update(@PathVariable Long id,
                                      @Valid @RequestBody MembershipPlanDTO dto) {
        return R.ok(membershipPlanService.updatePlan(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('member:update')")
    @Operation(summary = "删除付费会员档")
    public R<Void> delete(@PathVariable Long id) {
        membershipPlanService.deletePlan(id);
        return R.ok(null);
    }
}
