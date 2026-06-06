package com.miniprogram.controller;

import com.miniprogram.annotation.OperationLog;
import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.module.CreateModuleVersionDTO;
import com.miniprogram.dto.module.ModuleVersionQueryDTO;
import com.miniprogram.entity.ModuleVersion;
import com.miniprogram.service.ModuleVersionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "通用模块版本管理", description = "各业务模块的版本快照、发布、回滚")
@RestController
@RequestMapping("/api/v1/admin/module-versions")
@RequiredArgsConstructor
public class ModuleVersionController {

    private final ModuleVersionService moduleVersionService;

    @Operation(summary = "版本列表", description = "分页查询模块版本列表")
    @GetMapping
    public R<PageResult<ModuleVersion>> listVersions(ModuleVersionQueryDTO queryDTO) {
        return R.ok(moduleVersionService.listVersions(queryDTO));
    }

    @Operation(summary = "目标数据版本列表", description = "获取指定模块+目标ID的所有版本（不分页）")
    @GetMapping("/target")
    public R<List<ModuleVersion>> listByTarget(
            @RequestParam String moduleType,
            @RequestParam Long targetId) {
        return R.ok(moduleVersionService.listVersionsByTarget(moduleType, targetId));
    }

    @Operation(summary = "版本详情", description = "获取版本详情（含快照数据）")
    @GetMapping("/{id}")
    public R<ModuleVersion> getVersionDetail(@PathVariable Long id) {
        return R.ok(moduleVersionService.getVersionDetail(id));
    }

    @Operation(summary = "最新已发布版本", description = "获取指定模块+目标ID的最新已发布版本")
    @GetMapping("/latest")
    public R<ModuleVersion> getLatestPublished(
            @RequestParam String moduleType,
            @RequestParam Long targetId) {
        return R.ok(moduleVersionService.getLatestPublished(moduleType, targetId));
    }

    @Operation(summary = "创建版本快照", description = "为业务数据创建一个版本快照")
    @PostMapping
    @OperationLog("创建模块版本")
    public R<ModuleVersion> createVersion(@Valid @RequestBody CreateModuleVersionDTO dto) {
        return R.ok(moduleVersionService.createVersion(dto));
    }

    @Operation(summary = "发布版本", description = "将草稿版本的配置正式发布生效")
    @PutMapping("/{id}/publish")
    @OperationLog("发布模块版本")
    public R<ModuleVersion> publishVersion(@PathVariable Long id) {
        return R.ok(moduleVersionService.publishVersion(id));
    }

    @Operation(summary = "回滚版本", description = "回滚到指定历史版本")
    @PostMapping("/{id}/rollback")
    @OperationLog("回滚模块版本")
    public R<ModuleVersion> rollbackVersion(
            @PathVariable Long id,
            @RequestParam(required = false) String reason) {
        return R.ok(moduleVersionService.rollbackVersion(id, reason));
    }

    @Operation(summary = "删除版本", description = "删除草稿状态的版本")
    @DeleteMapping("/{id}")
    @OperationLog("删除模块版本")
    public R<Void> deleteVersion(@PathVariable Long id) {
        moduleVersionService.deleteVersion(id);
        return R.ok();
    }

    @Operation(summary = "版本统计", description = "获取指定模块类型的版本统计数据")
    @GetMapping("/stats")
    public R<Map<String, Object>> getVersionStats(
            @RequestParam(required = false) String moduleType) {
        return R.ok(moduleVersionService.getVersionStats(moduleType));
    }
}
