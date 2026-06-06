package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.*;
import com.miniprogram.service.AssetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 后台-素材库管理
 */
@RestController
@RequestMapping("/api/v1/admin/assets")
@RequiredArgsConstructor
@Tag(name = "后台-素材库管理")
public class AdminAssetController {

    private final AssetService assetService;

    // ==================== 素材管理 ====================

    @GetMapping
    @Operation(summary = "素材列表")
    public R<PageResult<AssetVO>> listAssets(@RequestParam(required = false) String type,
                                              @RequestParam(required = false) Long groupId,
                                              @RequestParam(required = false) String keyword,
                                              @RequestParam(defaultValue = "1") Long current,
                                              @RequestParam(defaultValue = "10") Long size) {
        return R.ok(assetService.listAssets(type, groupId, keyword, current, size));
    }

    @PostMapping
    @Operation(summary = "上传素材")
    public R<AssetVO> createAsset(@Valid @RequestBody AssetDTO dto) {
        return R.ok(assetService.createAsset(dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新素材")
    public R<AssetVO> updateAsset(@PathVariable Long id, @Valid @RequestBody AssetDTO dto) {
        return R.ok(assetService.updateAsset(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除素材")
    public R<Void> deleteAsset(@PathVariable Long id) {
        assetService.deleteAsset(id);
        return R.ok(null);
    }

    // ==================== 分组管理 ====================

    @GetMapping("/groups")
    @Operation(summary = "分组列表")
    public R<PageResult<AssetGroupVO>> listGroups(@RequestParam(defaultValue = "1") Long current,
                                                   @RequestParam(defaultValue = "10") Long size) {
        return R.ok(assetService.listGroups(current, size));
    }

    @PostMapping("/groups")
    @Operation(summary = "创建分组")
    public R<AssetGroupVO> createGroup(@Valid @RequestBody AssetGroupDTO dto) {
        return R.ok(assetService.createGroup(dto));
    }

    @PutMapping("/groups/{id}")
    @Operation(summary = "更新分组")
    public R<AssetGroupVO> updateGroup(@PathVariable Long id, @Valid @RequestBody AssetGroupDTO dto) {
        return R.ok(assetService.updateGroup(id, dto));
    }

    @DeleteMapping("/groups/{id}")
    @Operation(summary = "删除分组")
    public R<Void> deleteGroup(@PathVariable Long id) {
        assetService.deleteGroup(id);
        return R.ok(null);
    }

    // ==================== 批量操作 ====================

    @PostMapping("/batch-delete")
    @Operation(summary = "批量删除素材")
    public R<Void> batchDeleteAssets(@Valid @RequestBody AssetBatchDTO dto) {
        assetService.batchDeleteAssets(dto.getIds());
        return R.ok(null);
    }

    @PostMapping("/batch-move")
    @Operation(summary = "批量移动素材")
    public R<Void> batchMoveAssets(@Valid @RequestBody AssetBatchDTO dto) {
        assetService.batchMoveAssets(dto.getIds(), dto.getGroupId());
        return R.ok(null);
    }

    // ==================== 微信同步 ====================

    @PostMapping("/sync-from-wechat")
    @Operation(summary = "从微信后台同步素材")
    public R<Map<String, Object>> syncFromWechat() {
        return R.ok(assetService.syncFromWechat());
    }

    @PostMapping("/sync-to-wechat")
    @Operation(summary = "同步本地素材到微信后台")
    public R<Void> syncToWechat(@Valid @RequestBody AssetBatchDTO dto) {
        assetService.syncToWechat(dto.getIds());
        return R.ok(null);
    }
}
