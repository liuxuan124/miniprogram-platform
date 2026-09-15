package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.ContentDetailDTO;
import com.miniprogram.dto.ContentQueryDTO;
import com.miniprogram.dto.planet.PlanetConfigVO;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.ContentService;
import com.miniprogram.service.MembershipAccessService;
import com.miniprogram.support.FeatureModuleGuard;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 小程序端：知识星球
 */
@Tag(name = "小程序-知识星球")
@RestController
@RequestMapping("/api/v1/mp/planet")
@RequiredArgsConstructor
public class MpPlanetController {

    private final MembershipAccessService membershipAccessService;
    private final ContentService contentService;
    private final FeatureModuleGuard featureModuleGuard;

    @Operation(summary = "星球首页（配置+套餐+会员状态）")
    @GetMapping("/home")
    public R<PlanetConfigVO> home() {
        featureModuleGuard.requirePlanetModule();
        return R.ok(membershipAccessService.getPublicPlanetHome(SecurityUtils.getCurrentUserId()));
    }

    @Operation(summary = "星球动态流")
    @GetMapping("/feed")
    public R<PageResult<ContentDetailDTO>> feed(ContentQueryDTO queryDTO) {
        featureModuleGuard.requirePlanetModule();
        if (queryDTO == null) {
            queryDTO = new ContentQueryDTO();
        }
        queryDTO.setContentType("moment");
        queryDTO.setPlanetExclusive(1);
        return R.ok(contentService.listPublishedContentsForPlanet(queryDTO, SecurityUtils.getCurrentUserId()));
    }

    @Operation(summary = "星球动态详情")
    @GetMapping("/contents/{id}")
    public R<ContentDetailDTO> detail(@PathVariable Long id) {
        featureModuleGuard.requirePlanetModule();
        return R.ok(contentService.getPublishedPlanetContentDetail(id, SecurityUtils.getCurrentUserId()));
    }
}
