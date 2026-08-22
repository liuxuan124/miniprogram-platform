package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.ContentCommentDTO;
import com.miniprogram.dto.ContentDTO;
import com.miniprogram.dto.ContentDetailDTO;
import com.miniprogram.dto.ContentQueryDTO;
import com.miniprogram.service.ContentInteractService;
import com.miniprogram.service.ContentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * 内容文章管理控制器（管理后台）
 */
@Tag(name = "内容管理", description = "内容文章 CRUD + 发布/下架")
@RestController
@RequestMapping("/api/v1/admin/contents")
@RequiredArgsConstructor
public class ContentController {

    private final ContentService contentService;
    private final ContentInteractService contentInteractService;

    @Operation(summary = "内容列表", description = "分页查询内容列表，支持关键词/分类/标签/状态筛选")
    @GetMapping
    @PreAuthorize("hasAuthority('content:list')")
    public R<PageResult<ContentDetailDTO>> listContents(ContentQueryDTO queryDTO) {
        return R.ok(contentService.listContents(queryDTO));
    }

    @Operation(summary = "创建内容", description = "创建内容文章")
    @PostMapping
    @PreAuthorize("hasAuthority('content:create')")
    public R<ContentDetailDTO> createContent(@Valid @RequestBody ContentDTO dto) {
        return R.ok(contentService.createContent(dto));
    }

    @Operation(summary = "内容详情", description = "获取内容文章详情")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('content:list')")
    public R<ContentDetailDTO> getContentDetail(@PathVariable Long id) {
        return R.ok(contentService.getContentDetail(id));
    }

    @Operation(summary = "更新内容", description = "更新内容文章")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('content:update')")
    public R<ContentDetailDTO> updateContent(@PathVariable Long id, @Valid @RequestBody ContentDTO dto) {
        return R.ok(contentService.updateContent(id, dto));
    }

    @Operation(summary = "删除内容", description = "删除内容文章")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('content:delete')")
    public R<Void> deleteContent(@PathVariable Long id) {
        contentService.deleteContent(id);
        return R.ok();
    }

    @Operation(summary = "发布内容", description = "将草稿内容发布")
    @PutMapping("/{id}/publish")
    @PreAuthorize("hasAuthority('content:publish')")
    public R<ContentDetailDTO> publishContent(@PathVariable Long id) {
        return R.ok(contentService.publishContent(id));
    }

    @Operation(summary = "下架内容", description = "将已发布内容下架")
    @PutMapping("/{id}/unpublish")
    @PreAuthorize("hasAuthority('content:publish')")
    public R<ContentDetailDTO> unpublishContent(@PathVariable Long id) {
        return R.ok(contentService.unpublishContent(id));
    }

    @Operation(summary = "评论列表（含待审）")
    @GetMapping("/comments")
    @PreAuthorize("hasAuthority('content:list')")
    public R<PageResult<ContentCommentDTO>> listComments(
            @RequestParam(required = false) Long contentId,
            @RequestParam(required = false) Integer status,
            @RequestParam(defaultValue = "1") long current,
            @RequestParam(defaultValue = "20") long size) {
        return R.ok(contentInteractService.adminListComments(contentId, status, current, size));
    }

    @Operation(summary = "审核评论：status=1 公开 / 0 隐藏")
    @PutMapping("/comments/{commentId}/status")
    @PreAuthorize("hasAuthority('content:update')")
    public R<Void> updateCommentStatus(@PathVariable Long commentId, @RequestParam Integer status) {
        contentInteractService.adminUpdateCommentStatus(commentId, status);
        return R.ok();
    }

    @Operation(summary = "删除评论")
    @DeleteMapping("/comments/{commentId}")
    @PreAuthorize("hasAuthority('content:delete')")
    public R<Void> deleteComment(@PathVariable Long commentId) {
        contentInteractService.adminDeleteComment(commentId);
        return R.ok();
    }
}
