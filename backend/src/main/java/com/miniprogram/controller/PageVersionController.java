package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.PageVersionDTO;
import com.miniprogram.service.PageVersionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
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
            @RequestParam(required = false) Long page,
            @RequestParam(required = false) Long page_size,
            @RequestParam(required = false) Long current,
            @RequestParam(required = false) Long size) {
        long resolvedPage = page != null ? page : (current != null ? current : 1L);
        long resolvedSize = page_size != null ? page_size : (size != null ? size : 20L);
        if (resolvedSize > 100) {
            throw new com.miniprogram.common.BusinessException(100101, "每页数量不能超过 100");
        }
        if (resolvedSize < 1) {
            resolvedSize = 20L;
        }
        return R.ok(pageVersionService.listVersions(id, resolvedPage, resolvedSize));
    }

    @Operation(summary = "版本回滚", description = "回滚到指定版本，生成新版本")
    @PostMapping("/{id}/versions/{version}/rollback")
    @PreAuthorize("hasAuthority('page:update')")
    public R<PageVersionDTO> rollbackVersion(
            @PathVariable Long id,
            @PathVariable Integer version) {
        return R.ok(pageVersionService.rollbackVersion(id, version));
    }
}
