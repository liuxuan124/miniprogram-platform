package com.miniprogram.controller;

import com.miniprogram.annotation.OperationLog;
import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.miniapp.CreateReleaseDTO;
import com.miniprogram.dto.miniapp.ReleaseQueryDTO;
import com.miniprogram.dto.miniapp.RollbackDTO;
import com.miniprogram.entity.MiniappRelease;
import com.miniprogram.entity.VersionOperationLog;
import com.miniprogram.service.MiniappReleaseService;
import com.miniprogram.service.VersionOperationLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "小程序版本发布管理", description = "小程序级别版本发布、回滚、操作日志")
@RestController
@RequestMapping("/api/v1/admin/miniapp-releases")
@RequiredArgsConstructor
public class MiniappReleaseController {

    private final MiniappReleaseService miniappReleaseService;
    private final VersionOperationLogService versionOperationLogService;

    @Operation(summary = "版本发布列表", description = "分页查询版本发布列表")
    @GetMapping
    public R<PageResult<MiniappRelease>> listReleases(ReleaseQueryDTO queryDTO) {
        return R.ok(miniappReleaseService.listReleases(queryDTO));
    }

    @Operation(summary = "版本发布详情", description = "获取版本发布详情（含快照）")
    @GetMapping("/{id}")
    public R<MiniappRelease> getReleaseDetail(@PathVariable Long id) {
        return R.ok(miniappReleaseService.getReleaseDetail(id));
    }

    @Operation(summary = "最新已发布版本", description = "获取最新已发布的版本")
    @GetMapping("/latest")
    public R<MiniappRelease> getLatestRelease() {
        return R.ok(miniappReleaseService.getLatestRelease());
    }

    @Operation(summary = "创建版本发布", description = "快照当前所有已发布页面和系统配置，创建新版本发布（支持 template/publish 双模式）")
    @PostMapping
    @OperationLog("创建版本发布")
    public R<MiniappRelease> createRelease(@Valid @RequestBody CreateReleaseDTO dto) {
        return R.ok(miniappReleaseService.createRelease(dto));
    }

    @Operation(summary = "提升模板为已发布版本", description = "将草稿/模板状态的版本直接提升为已发布状态")
    @PutMapping("/{id}/promote")
    @OperationLog("提升模板为已发布版本")
    public R<MiniappRelease> promoteRelease(@PathVariable Long id) {
        return R.ok(miniappReleaseService.promoteRelease(id));
    }

    @Operation(summary = "删除模板", description = "逻辑删除草稿/模板状态的版本（不允许删除已发布的版本）")
    @DeleteMapping("/{id}")
    @OperationLog("删除模板")
    public R<Void> deleteRelease(@PathVariable Long id) {
        miniappReleaseService.deleteRelease(id);
        return R.ok();
    }

    @Operation(summary = "获取所有版本列表", description = "不分页获取版本列表，支持按状态筛选")
    @GetMapping("/list")
    public R<List<MiniappRelease>> listAllReleases(@RequestParam(required = false) Integer status) {
        var query = new ReleaseQueryDTO();
        query.setStatus(status);
        query.setCurrent(1L);
        query.setSize(100L);
        PageResult<MiniappRelease> result = miniappReleaseService.listReleases(query);
        return R.ok(result.getRecords());
    }

    @Operation(summary = "发布版本", description = "将草稿状态的版本发布")
    @PostMapping("/{id}/publish")
    @OperationLog("发布版本")
    public R<MiniappRelease> publishRelease(@PathVariable Long id) {
        return R.ok(miniappReleaseService.publishRelease(id));
    }

    @Operation(summary = "版本回滚", description = "回滚到指定版本")
    @PostMapping("/rollback")
    @OperationLog("版本回滚")
    public R<MiniappRelease> rollbackRelease(@Valid @RequestBody RollbackDTO dto) {
        return R.ok(miniappReleaseService.rollbackRelease(dto));
    }

    @Operation(summary = "版本历史", description = "获取所有已发布版本（用于版本选择器）")
    @GetMapping("/history")
    public R<List<MiniappRelease>> getReleaseHistory() {
        return R.ok(miniappReleaseService.getReleaseHistory());
    }

    @Operation(summary = "生成下一版本号", description = "根据变更类型自动生成下一语义化版本号")
    @GetMapping("/next-semver")
    public R<String> generateNextSemver(@RequestParam(defaultValue = "patch") String changeType) {
        return R.ok(miniappReleaseService.generateNextSemver(changeType));
    }

    @Operation(summary = "版本操作日志", description = "分页查询版本操作日志")
    @GetMapping("/operation-logs")
    public R<PageResult<VersionOperationLog>> listLogs(
            @RequestParam(defaultValue = "1") Long current,
            @RequestParam(defaultValue = "20") Long size) {
        return R.ok(versionOperationLogService.listLogs(current, size));
    }
}
