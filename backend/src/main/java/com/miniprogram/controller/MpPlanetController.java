package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.ContentDetailDTO;
import com.miniprogram.dto.ContentQueryDTO;
import com.miniprogram.dto.planet.MainPlanetRequest;
import com.miniprogram.dto.planet.MainPlanetVO;
import com.miniprogram.dto.planet.PlanetCommunityVO;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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

    @Operation(summary = "星球首页（配置+套餐+会员状态+本周热门话题）")
    @GetMapping("/home")
    public R<PlanetConfigVO> home(@RequestParam(required = false) String planetId) {
        featureModuleGuard.requirePlanetModule();
        return R.ok(membershipAccessService.getPublicPlanetHome(SecurityUtils.getCurrentUserId(), planetId));
    }

    @Operation(summary = "社区列表（我的星球）")
    @GetMapping("/communities")
    public R<List<PlanetCommunityVO>> communities() {
        featureModuleGuard.requirePlanetModule();
        return R.ok(membershipAccessService.listCommunities(SecurityUtils.getCurrentUserId()));
    }

    @Operation(summary = "单个社区详情卡片")
    @GetMapping("/communities/{id}")
    public R<PlanetCommunityVO> community(@PathVariable String id) {
        featureModuleGuard.requirePlanetModule();
        return R.ok(membershipAccessService.getCommunity(id));
    }

    @Operation(summary = "当前主星球（常驻）；未登录/未设置时回落配置 primary")
    @GetMapping("/main")
    public R<MainPlanetVO> mainPlanet() {
        featureModuleGuard.requirePlanetModule();
        return R.ok(membershipAccessService.resolveMainPlanet(SecurityUtils.getCurrentUserId()));
    }

    @Operation(summary = "设为常驻主星球")
    @PutMapping("/main")
    public R<MainPlanetVO> setMainPlanet(@RequestBody MainPlanetRequest request) {
        featureModuleGuard.requirePlanetModule();
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        String planetId = request != null ? request.getPlanetId() : null;
        return R.ok(membershipAccessService.setMainPlanet(userId, planetId));
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
        if (queryDTO.getPlanetId() == null || queryDTO.getPlanetId().isBlank()) {
            MainPlanetVO main = membershipAccessService.resolveMainPlanet(SecurityUtils.getCurrentUserId());
            if (main != null && main.getPlanetId() != null) {
                queryDTO.setPlanetId(main.getPlanetId());
            }
        }
        return R.ok(contentService.listPublishedContentsForPlanet(queryDTO, SecurityUtils.getCurrentUserId()));
    }

    @Operation(summary = "星球动态详情")
    @GetMapping("/contents/{id}")
    public R<ContentDetailDTO> detail(@PathVariable Long id) {
        featureModuleGuard.requirePlanetModule();
        return R.ok(contentService.getPublishedPlanetContentDetail(id, SecurityUtils.getCurrentUserId()));
    }
}
