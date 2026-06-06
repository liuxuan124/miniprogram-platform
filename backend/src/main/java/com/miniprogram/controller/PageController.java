package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.*;
import com.miniprogram.service.PageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 页面管理控制器（管理后台）
 */
@Tag(name = "页面管理", description = "页面搭建 CRUD + 发布/下架/草稿")
@RestController
@RequestMapping("/api/v1/admin/pages")
@RequiredArgsConstructor
public class PageController {

    private final PageService pageService;

    @Operation(summary = "页面列表", description = "分页查询页面列表")
    @GetMapping
    public R<PageResult<PageDetailDTO>> listPages(PageQueryDTO queryDTO) {
        return R.ok(pageService.listPages(queryDTO));
    }

    @Operation(summary = "创建页面", description = "创建新页面")
    @PostMapping
    public R<PageDetailDTO> createPage(@Valid @RequestBody PageCreateDTO createDTO) {
        return R.ok(pageService.createPage(createDTO));
    }

    @Operation(summary = "页面详情", description = "获取页面详情信息")
    @GetMapping("/{id}")
    public R<PageDetailDTO> getPageDetail(@PathVariable Long id) {
        return R.ok(pageService.getPageDetail(id));
    }

    @Operation(summary = "更新页面信息", description = "更新页面基本信息（不含DSL）")
    @PutMapping("/{id}")
    public R<PageDetailDTO> updatePage(@PathVariable Long id, @RequestBody PageUpdateDTO updateDTO) {
        return R.ok(pageService.updatePage(id, updateDTO));
    }

    @Operation(summary = "删除页面", description = "删除页面（已发布页面不可删除）")
    @DeleteMapping("/{id}")
    public R<Void> deletePage(@PathVariable Long id) {
        pageService.deletePage(id);
        return R.ok();
    }

    @Operation(summary = "保存草稿", description = "保存页面草稿，生成新版本")
    @PostMapping("/{id}/draft")
    public R<PageVersionDTO> saveDraft(@PathVariable Long id, @Valid @RequestBody PageDraftDTO draftDTO) {
        return R.ok(pageService.saveDraft(id, draftDTO));
    }

    @Operation(summary = "发布页面", description = "发布当前版本页面")
    @PostMapping("/{id}/publish")
    public R<PageDetailDTO> publishPage(@PathVariable Long id) {
        return R.ok(pageService.publishPage(id));
    }

    @Operation(summary = "下架页面", description = "下架已发布的页面")
    @PostMapping("/{id}/unpublish")
    public R<PageDetailDTO> unpublishPage(@PathVariable Long id) {
        return R.ok(pageService.unpublishPage(id));
    }
}
