package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.member.MembershipPlanVO;
import com.miniprogram.service.MembershipPlanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@Tag(name = "小程序-会员档位")
@RestController
@RequestMapping("/api/v1/mp/membership-plans")
@RequiredArgsConstructor
public class MpMembershipPlanController {

    private final MembershipPlanService membershipPlanService;

    @GetMapping
    @Operation(summary = "在售会员档位列表")
    public R<List<MembershipPlanVO>> list(
            @RequestParam(defaultValue = "platform") String scope,
            @RequestParam(required = false) String planetId) {
        String normalizedScope = StringUtils.hasText(scope) ? scope : "platform";
        List<MembershipPlanVO> rows = membershipPlanService.listPlans(normalizedScope, planetId);
        List<MembershipPlanVO> active = rows.stream()
                .filter(p -> p.getStatus() != null && p.getStatus() == 1)
                .collect(Collectors.toList());
        return R.ok(active);
    }
}
