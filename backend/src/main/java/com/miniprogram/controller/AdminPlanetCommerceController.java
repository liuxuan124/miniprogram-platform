package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.entity.PlanetCommerceConfig;
import com.miniprogram.service.PlanetCommerceService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/planet-commerce")
@RequiredArgsConstructor
public class AdminPlanetCommerceController {

    private final PlanetCommerceService planetCommerceService;

    @GetMapping("/{planetId}")
    @PreAuthorize("hasAuthority('content:list')")
    @Operation(summary = "读取星球商业配置")
    public R<PlanetCommerceConfig> get(@PathVariable String planetId) {
        return R.ok(planetCommerceService.getByPlanetId(planetId));
    }

    @PutMapping("/{planetId}")
    @PreAuthorize("hasAuthority('content:update')")
    @Operation(summary = "保存星球商业配置")
    public R<Void> save(@PathVariable String planetId, @RequestBody PlanetCommerceConfig body) {
        if (body != null) {
            body.setPlanetId(planetId);
        }
        planetCommerceService.saveConfig(body);
        return R.ok();
    }
}
