package com.miniprogram.controller;

import com.miniprogram.annotation.OperationLog;
import com.miniprogram.common.R;
import com.miniprogram.dto.mini.MiniContentReleaseVO;
import com.miniprogram.dto.mini.MiniPublishRequestDTO;
import com.miniprogram.dto.mini.MiniPublishResultVO;
import com.miniprogram.dto.mini.MiniRollbackResultVO;
import com.miniprogram.dto.mini.MiniSiteUpdateDTO;
import com.miniprogram.dto.mini.MiniSiteVO;
import com.miniprogram.dto.mini.PendingChangesVO;
import com.miniprogram.service.mini.MiniSiteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "小程序站点聚合", description = "站点配置唯一源：草稿编辑 / 待发布 / 一次发布")
@RestController
@RequestMapping("/api/v1/admin/mini")
@RequiredArgsConstructor
public class MiniSiteController {

    private final MiniSiteService miniSiteService;

    @Operation(summary = "获取站点聚合", description = "view=draft（默认，管理端编辑）| live（已上线）")
    @GetMapping("/site")
    @PreAuthorize("hasAuthority('page:list')")
    public R<MiniSiteVO> getSite(@RequestParam(value = "view", defaultValue = "draft") String view) {
        return R.ok(miniSiteService.getSite(view));
    }

    @Operation(summary = "更新站点草稿", description = "写入 site_builder_draft，不直接改 live")
    @PutMapping("/site")
    @OperationLog("更新小程序站点草稿")
    @PreAuthorize("hasAuthority('page:list') or hasAuthority('page:update')")
    public R<MiniSiteVO> updateSite(@RequestBody MiniSiteUpdateDTO dto) {
        return R.ok(miniSiteService.updateSiteDraft(dto));
    }

    @Operation(summary = "待发布改动列表")
    @GetMapping("/pending-changes")
    @PreAuthorize("hasAuthority('page:list')")
    public R<PendingChangesVO> pendingChanges() {
        return R.ok(miniSiteService.listPendingChanges());
    }

    @Operation(summary = "一次发布", description = "提升站点草稿 + 发布脏页 + 递增发布序号；可传 pageIds/includeSite 勾选")
    @PostMapping("/publish")
    @OperationLog("发布小程序内容（第 N 次）")
    @PreAuthorize("hasAuthority('page:publish')")
    public R<MiniPublishResultVO> publish(@RequestBody(required = false) MiniPublishRequestDTO request) {
        return R.ok(miniSiteService.publish(request));
    }

    @Operation(summary = "内容发布时间线")
    @GetMapping("/releases")
    @PreAuthorize("hasAuthority('page:list')")
    public R<List<MiniContentReleaseVO>> listReleases() {
        return R.ok(miniSiteService.listContentReleases());
    }

    @Operation(summary = "回滚为待发布草稿", description = "不直接改线上；运营需再到发布页确认")
    @PostMapping("/releases/{id}/prepare-rollback")
    @OperationLog("内容发布回滚为待发布")
    @PreAuthorize("hasAuthority('page:publish')")
    public R<MiniRollbackResultVO> prepareRollback(@PathVariable("id") Long id) {
        return R.ok(miniSiteService.prepareRollback(id));
    }
}
