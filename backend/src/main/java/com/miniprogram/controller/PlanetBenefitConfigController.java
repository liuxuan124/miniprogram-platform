package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.entity.PlanetBenefitConfig;
import com.miniprogram.service.PlanetBenefitConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 管理端：星球权益统一配置（mp_planet_benefit_config）。
 * 与 AdminMembershipPlanController 配合：档位管"卖什么"，本接口管"买了能干啥"。
 */
@Tag(name = "管理端-星球权益配置")
@RestController
@RequestMapping("/api/v1/admin/planet-benefit")
@RequiredArgsConstructor
public class PlanetBenefitConfigController {

    private final PlanetBenefitConfigService planetBenefitConfigService;

    @Operation(summary = "全部星球权益配置列表")
    @GetMapping
    @PreAuthorize("hasAuthority('member:list') or hasAuthority('system:config')")
    public R<List<PlanetBenefitConfig>> list() {
        return R.ok(planetBenefitConfigService.listAll());
    }

    @Operation(summary = "获取指定星球权益配置（不存在返回默认值）")
    @GetMapping("/{planetId}")
    @PreAuthorize("hasAuthority('member:list') or hasAuthority('system:config')")
    public R<PlanetBenefitConfig> get(@PathVariable String planetId) {
        return R.ok(planetBenefitConfigService.getByPlanetId(planetId));
    }

    @Operation(summary = "保存（upsert）指定星球权益配置")
    @PutMapping("/{planetId}")
    @PreAuthorize("hasAuthority('member:update') or hasAuthority('system:config')")
    public R<PlanetBenefitConfig> save(@PathVariable String planetId,
                                       @RequestBody PlanetBenefitConfig patch) {
        return R.ok(planetBenefitConfigService.save(planetId, patch));
    }

    @Operation(summary = "重置为默认值（删除自定义配置）")
    @DeleteMapping("/{planetId}")
    @PreAuthorize("hasAuthority('member:update') or hasAuthority('system:config')")
    public R<Void> reset(@PathVariable String planetId) {
        planetBenefitConfigService.reset(planetId);
        return R.ok(null);
    }
}
