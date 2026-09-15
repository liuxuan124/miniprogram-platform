package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.planet.PlanetConfigDTO;
import com.miniprogram.dto.planet.PlanetConfigVO;
import com.miniprogram.service.MembershipAccessService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理端：知识星球配置
 */
@Tag(name = "管理端-知识星球")
@RestController
@RequestMapping("/api/v1/admin/planet")
@RequiredArgsConstructor
public class AdminPlanetController {

    private final MembershipAccessService membershipAccessService;

    @Operation(summary = "获取星球配置")
    @GetMapping("/config")
    @PreAuthorize("hasAuthority('member:list') or hasAuthority('content:update') or hasAuthority('system:config')")
    public R<PlanetConfigVO> getConfig() {
        return R.ok(membershipAccessService.getAdminPlanetConfig());
    }

    @Operation(summary = "保存星球配置")
    @PutMapping("/config")
    @PreAuthorize("hasAuthority('system:config') or hasAuthority('member:list')")
    public R<Void> saveConfig(@RequestBody PlanetConfigDTO dto) {
        membershipAccessService.saveAdminPlanetConfig(dto);
        return R.ok();
    }
}
