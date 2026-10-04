package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.member.MembershipPlanVO;
import com.miniprogram.service.MembershipAccessService;
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
    private final MembershipAccessService membershipAccessService;

    @GetMapping
    @Operation(summary = "在售会员档位列表（按运营模式过滤）")
    public R<List<MembershipPlanVO>> list(
            @RequestParam(defaultValue = "platform") String scope,
            @RequestParam(required = false) String planetId) {
        String normalizedScope = StringUtils.hasText(scope) ? scope : "platform";
        List<MembershipPlanVO> rows = membershipPlanService.listPlans(normalizedScope, planetId);
        // 仅返回启用的档位
        List<MembershipPlanVO> active = rows.stream()
                .filter(p -> p.getStatus() != null && p.getStatus() == 1)
                .collect(Collectors.toList());

        // 运营模式过滤：
        // - platform_primary (A)：平台档售卖；星球档不作为付费项返回（只返 platform）
        // - dual (B)：两类全返
        // - planet_only (C)：隐藏 platform 档，只返 planet 档（含通票）
        String operatingMode = membershipAccessService.getOperatingMode();
        if ("planet_only".equalsIgnoreCase(operatingMode)) {
            active = active.stream()
                    .filter(p -> !"platform".equalsIgnoreCase(p.getScope()))
                    .collect(Collectors.toList());
        } else if ("platform_primary".equalsIgnoreCase(operatingMode)) {
            // 前端请求 scope=planet 时仍允许返回（星球档用于展示会员身份），
            // 但默认 scope=platform 时不混入 planet 档
            if ("platform".equalsIgnoreCase(normalizedScope)) {
                active = active.stream()
                        .filter(p -> "platform".equalsIgnoreCase(p.getScope()))
                        .collect(Collectors.toList());
            }
        }
        // dual：不过滤
        return R.ok(active);
    }
}

