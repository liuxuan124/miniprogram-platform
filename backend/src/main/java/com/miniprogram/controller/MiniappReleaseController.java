package com.miniprogram.controller;

import com.miniprogram.annotation.OperationLog;
import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.miniapp.CreateReleaseDTO;
import com.miniprogram.dto.miniapp.PublishPreflightVO;
import com.miniprogram.dto.miniapp.PushPreviewDTO;
import com.miniprogram.dto.miniapp.PushPreviewResultVO;
import com.miniprogram.dto.miniapp.ReleaseQueryDTO;
import com.miniprogram.dto.miniapp.RollbackDTO;
import com.miniprogram.dto.miniapp.StoreTemplateNameDTO;
import com.miniprogram.entity.MiniappRelease;
import com.miniprogram.entity.VersionOperationLog;
import com.miniprogram.service.MiniappReleaseService;
import com.miniprogram.service.MiniappWxUploadService;
import com.miniprogram.service.SystemConfigService;
import com.miniprogram.service.VersionOperationLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "小程序版本发布管理", description = "小程序级别版本发布、回滚、操作日志")
@RestController
@RequestMapping("/api/v1/admin/miniapp-releases")
@RequiredArgsConstructor
public class MiniappReleaseController {

    private final MiniappReleaseService miniappReleaseService;
    private final VersionOperationLogService versionOperationLogService;
    private final MiniappWxUploadService miniappWxUploadService;
    private final SystemConfigService systemConfigService;

    @Operation(summary = "版本发布列表", description = "分页查询版本发布列表")
    @GetMapping
    @PreAuthorize("hasAuthority('page:list')")
    public R<PageResult<MiniappRelease>> listReleases(ReleaseQueryDTO queryDTO) {
        return R.ok(miniappReleaseService.listReleases(queryDTO));
    }

    @Operation(summary = "整包发布前检查", description = "检查首页、导航绑定与待发布页面，供发布页展示")
    @GetMapping("/preflight")
    @PreAuthorize("hasAuthority('page:list')")
    public R<PublishPreflightVO> getPublishPreflight() {
        return R.ok(miniappReleaseService.getPublishPreflight());
    }

    @Operation(summary = "最新已发布版本", description = "获取最新已发布的版本")
    @GetMapping("/latest")
    @PreAuthorize("hasAuthority('page:list')")
    public R<MiniappRelease> getLatestRelease() {
        return R.ok(miniappReleaseService.getLatestRelease());
    }

    @Operation(summary = "获取所有版本列表", description = "不分页获取版本列表，支持按状态筛选")
    @GetMapping("/list")
    @PreAuthorize("hasAuthority('page:list')")
    public R<List<MiniappRelease>> listAllReleases(@RequestParam(required = false) Integer status) {
        var query = new ReleaseQueryDTO();
        query.setStatus(status);
        query.setCurrent(1L);
        query.setSize(100L);
        PageResult<MiniappRelease> result = miniappReleaseService.listReleases(query);
        return R.ok(result.getRecords());
    }

    @Operation(summary = "版本历史", description = "获取所有已发布版本（用于版本选择器）")
    @GetMapping("/history")
    @PreAuthorize("hasAuthority('page:list')")
    public R<List<MiniappRelease>> getReleaseHistory() {
        return R.ok(miniappReleaseService.getReleaseHistory());
    }

    @Operation(summary = "生成下一版本号", description = "根据变更类型自动生成下一语义化版本号")
    @GetMapping("/next-semver")
    @PreAuthorize("hasAuthority('page:list')")
    public R<String> generateNextSemver(@RequestParam(defaultValue = "patch") String changeType) {
        return R.ok(miniappReleaseService.generateNextSemver(changeType));
    }

    @Operation(summary = "版本操作日志", description = "分页查询版本操作日志")
    @GetMapping("/operation-logs")
    @PreAuthorize("hasAuthority('page:list')")
    public R<PageResult<VersionOperationLog>> listLogs(
            @RequestParam(defaultValue = "1") Long current,
            @RequestParam(defaultValue = "20") Long size) {
        return R.ok(versionOperationLogService.listLogs(current, size));
    }

    @Operation(summary = "最近体验版推送状态", description = "获取最近一次体验版推送结果")
    @GetMapping("/push-preview/status")
    @PreAuthorize("hasAuthority('page:list')")
    public R<PushPreviewResultVO> getPushPreviewStatus() {
        return R.ok(miniappWxUploadService.getLastPushStatus());
    }

    @Operation(summary = "上线到小程序", description = "提升品牌导航草稿并发布绑定页未上线改动；不是上传微信代码包")
    @PostMapping("/publish-content")
    @OperationLog("上线内容到小程序")
    @PreAuthorize("hasAuthority('page:publish')")
    public R<Map<String, Object>> publishContentToMiniapp() {
        boolean promoted = systemConfigService.promoteSiteBuilderDraft();
        Map<String, Object> result = miniappReleaseService.publishContentToMiniapp();
        result.put("siteConfigPromoted", promoted);
        return R.ok(result);
    }

    @Operation(summary = "整店模板列表", description = "内容/版式模板，不是微信代码包版本")
    @GetMapping("/store-templates")
    @PreAuthorize("hasAuthority('page:list')")
    public R<List<MiniappRelease>> listStoreTemplates() {
        return R.ok(miniappReleaseService.listStoreTemplates());
    }

    @Operation(summary = "从当前搭建新建整店模板")
    @PostMapping("/store-templates")
    @OperationLog("新建整店模板")
    @PreAuthorize("hasAuthority('page:publish')")
    public R<MiniappRelease> createStoreTemplate(@RequestBody(required = false) StoreTemplateNameDTO dto) {
        return R.ok(miniappReleaseService.createStoreTemplate(dto));
    }

    @Operation(summary = "复制整店模板")
    @PostMapping("/{id}/duplicate")
    @OperationLog("复制整店模板")
    @PreAuthorize("hasAuthority('page:publish')")
    public R<MiniappRelease> duplicateStoreTemplate(@PathVariable Long id,
                                                   @RequestBody(required = false) StoreTemplateNameDTO dto) {
        String name = dto == null ? null : dto.getTemplateName();
        return R.ok(miniappReleaseService.duplicateStoreTemplate(id, name));
    }

    @Operation(summary = "重命名整店模板")
    @PutMapping("/{id}/rename")
    @OperationLog("重命名整店模板")
    @PreAuthorize("hasAuthority('page:publish')")
    public R<MiniappRelease> renameStoreTemplate(@PathVariable Long id, @Valid @RequestBody StoreTemplateNameDTO dto) {
        return R.ok(miniappReleaseService.renameStoreTemplate(id, dto.getTemplateName()));
    }

    @Operation(summary = "选用整店模板为正在搭建", description = "写入页面与外观配置，不上传微信代码包")
    @PutMapping("/{id}/activate")
    @OperationLog("选用整店模板")
    @PreAuthorize("hasAuthority('page:publish')")
    public R<MiniappRelease> activateStoreTemplate(@PathVariable Long id) {
        return R.ok(miniappReleaseService.activateStoreTemplate(id));
    }

    @Operation(summary = "用当前搭建覆盖模板快照")
    @PostMapping("/{id}/capture")
    @OperationLog("保存整店模板")
    @PreAuthorize("hasAuthority('page:publish')")
    public R<MiniappRelease> captureStoreTemplate(@PathVariable Long id) {
        return R.ok(miniappReleaseService.captureStoreTemplate(id));
    }

    @Operation(summary = "版本发布详情", description = "获取版本发布详情（含快照）")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('page:list')")
    public R<MiniappRelease> getReleaseDetail(@PathVariable Long id) {
        return R.ok(miniappReleaseService.getReleaseDetail(id));
    }

    @Operation(summary = "创建版本发布", description = "快照当前所有已发布页面和系统配置，创建新版本发布（支持 template/publish 双模式）")
    @PostMapping
    @OperationLog("创建版本发布")
    @PreAuthorize("hasAuthority('page:publish')")
    public R<MiniappRelease> createRelease(@Valid @RequestBody CreateReleaseDTO dto) {
        return R.ok(miniappReleaseService.createRelease(dto));
    }

    @Operation(summary = "提升模板为已发布版本", description = "将草稿/模板状态的版本直接提升为已发布状态")
    @PutMapping("/{id}/promote")
    @OperationLog("提升模板为已发布版本")
    @PreAuthorize("hasAuthority('page:publish')")
    public R<MiniappRelease> promoteRelease(@PathVariable Long id) {
        return R.ok(miniappReleaseService.promoteRelease(id));
    }

    @Operation(summary = "删除模板", description = "逻辑删除版本（仅当前线上版本不允许删除）")
    @DeleteMapping("/{id}")
    @OperationLog("删除模板")
    @PreAuthorize("hasAuthority('page:publish')")
    public R<Void> deleteRelease(@PathVariable Long id) {
        miniappReleaseService.deleteRelease(id);
        return R.ok();
    }

    @Operation(summary = "发布版本", description = "将草稿状态的版本发布")
    @PostMapping("/{id}/publish")
    @OperationLog("发布版本")
    @PreAuthorize("hasAuthority('page:publish')")
    public R<MiniappRelease> publishRelease(@PathVariable Long id) {
        return R.ok(miniappReleaseService.publishRelease(id));
    }

    @Operation(summary = "版本回滚", description = "回滚到指定版本")
    @PostMapping("/rollback")
    @OperationLog("版本回滚")
    @PreAuthorize("hasAuthority('page:publish')")
    public R<MiniappRelease> rollbackRelease(@Valid @RequestBody RollbackDTO dto) {
        return R.ok(miniappReleaseService.rollbackRelease(dto));
    }

    @Operation(summary = "推送微信小程序体验版", description = "当 miniapp 代码有变更时，一键上传代码到微信体验版")
    @PostMapping("/{id}/push-preview")
    @OperationLog("推送微信小程序体验版")
    @PreAuthorize("hasAuthority('page:publish')")
    public R<PushPreviewResultVO> pushPreview(@PathVariable Long id, @RequestBody(required = false) PushPreviewDTO dto) {
        return R.ok(miniappWxUploadService.pushPreview(id, dto));
    }
}
