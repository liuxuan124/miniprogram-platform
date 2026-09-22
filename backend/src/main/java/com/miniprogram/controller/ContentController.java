package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.ContentCommentDTO;
import com.miniprogram.dto.ContentDTO;
import com.miniprogram.dto.ContentDetailDTO;
import com.miniprogram.dto.ContentQueryDTO;
import com.miniprogram.dto.ContentStatsDTO;
import com.miniprogram.dto.ContentUnpublishDTO;
import com.miniprogram.service.ContentInteractService;
import com.miniprogram.service.ContentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 内容文章管理控制器（管理后台）
 */
@Tag(name = "内容管理", description = "内容文章 CRUD + 发布/下架/定时/回收站")
@RestController
@RequestMapping("/api/v1/admin/contents")
@RequiredArgsConstructor
public class ContentController {

    private final ContentService contentService;
    private final ContentInteractService contentInteractService;

    @Operation(summary = "内容列表", description = "分页查询内容列表，支持关键词/分类/标签/状态筛选；默认排除回收站")
    @GetMapping
    @PreAuthorize("hasAuthority('content:list')")
    public R<PageResult<ContentDetailDTO>> listContents(ContentQueryDTO queryDTO) {
        return R.ok(contentService.listContents(queryDTO));
    }

    @Operation(summary = "内容状态统计", description = "各状态数量；可选 contentType")
    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('content:list')")
    public R<ContentStatsDTO> getContentStats(@RequestParam(required = false) String contentType) {
        return R.ok(contentService.getContentStats(contentType));
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

    @Operation(summary = "更新内容", description = "更新内容文章；已上架允许覆盖（confirmOverwrite 仅前端确认标记）")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('content:update')")
    public R<ContentDetailDTO> updateContent(@PathVariable Long id, @Valid @RequestBody ContentDTO dto) {
        return R.ok(contentService.updateContent(id, dto));
    }

    @Operation(summary = "删除内容", description = "软删进回收站（status=deleted）")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('content:delete')")
    public R<Void> deleteContent(@PathVariable Long id) {
        contentService.deleteContent(id);
        return R.ok();
    }

    @Operation(summary = "彻底删除", description = "回收站内物理逻辑删除（TableLogic）")
    @DeleteMapping("/{id}/purge")
    @PreAuthorize("hasAuthority('content:delete')")
    public R<Void> purgeContent(@PathVariable Long id) {
        contentService.purgeContent(id);
        return R.ok();
    }

    @Operation(summary = "恢复内容", description = "回收站恢复为草稿")
    @PutMapping("/{id}/restore")
    @PreAuthorize("hasAuthority('content:update')")
    public R<ContentDetailDTO> restoreContent(@PathVariable Long id) {
        return R.ok(contentService.restoreContent(id));
    }

    @Operation(summary = "发布内容", description = "将草稿/定时/下架内容上架")
    @PutMapping("/{id}/publish")
    @PreAuthorize("hasAuthority('content:publish')")
    public R<ContentDetailDTO> publishContent(@PathVariable Long id) {
        return R.ok(contentService.publishContent(id));
    }

    @Operation(summary = "下架内容", description = "将已发布内容下架；可选 body.reason")
    @PutMapping("/{id}/unpublish")
    @PreAuthorize("hasAuthority('content:publish')")
    public R<ContentDetailDTO> unpublishContent(
            @PathVariable Long id,
            @RequestBody(required = false) ContentUnpublishDTO body) {
        String reason = body != null ? body.getReason() : null;
        return R.ok(contentService.unpublishContent(id, reason));
    }

    @Operation(summary = "定时发布", description = "设定定时发布时间，status=scheduled")
    @PutMapping("/{id}/schedule")
    @PreAuthorize("hasAuthority('content:publish')")
    public R<ContentDetailDTO> scheduleContent(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String scheduledAt = body != null ? body.get("scheduledAt") : null;
        return R.ok(contentService.scheduleContent(id, scheduledAt));
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
