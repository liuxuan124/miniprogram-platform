package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.PageVersionDTO;
import com.miniprogram.service.PageVersionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 页面版本控制器（管理后台）
 */
@Tag(name = "页面版本管理", description = "版本列表 + 回滚")
@RestController
@RequestMapping("/api/v1/admin/pages")
@RequiredArgsConstructor
public class PageVersionController {

    private final PageVersionService pageVersionService;

    @Operation(summary = "版本列表", description = "获取页面版本列表")
    @GetMapping("/{id}/versions")
    public R<PageResult<PageVersionDTO>> listVersions(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") Long current,
            @RequestParam(defaultValue = "10") Long size) {
        return R.ok(pageVersionService.listVersions(id, current, size));
    }

    @Operation(summary = "版本回滚", description = "回滚到指定版本，生成新版本")
    @PostMapping("/{id}/versions/{version}/rollback")
    public R<PageVersionDTO> rollbackVersion(
            @PathVariable Long id,
            @PathVariable Integer version) {
        return R.ok(pageVersionService.rollbackVersion(id, version));
    }
}
