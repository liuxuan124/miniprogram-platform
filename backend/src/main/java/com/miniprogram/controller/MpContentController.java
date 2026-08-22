package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.ContentCommentDTO;
import com.miniprogram.dto.ContentDetailDTO;
import com.miniprogram.dto.ContentInteractStateDTO;
import com.miniprogram.dto.ContentQueryDTO;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.ContentInteractService;
import com.miniprogram.service.ContentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 小程序端内容控制器
 */
@Tag(name = "小程序-内容", description = "小程序端内容列表/详情/互动")
@RestController
@RequestMapping("/api/v1/mp/contents")
@RequiredArgsConstructor
public class MpContentController {

    private final ContentService contentService;
    private final ContentInteractService contentInteractService;

    @Operation(summary = "内容列表", description = "小程序端获取已发布内容列表，支持分类/标签筛选")
    @GetMapping
    public R<PageResult<ContentDetailDTO>> listPublishedContents(ContentQueryDTO queryDTO) {
        return R.ok(contentService.listPublishedContents(queryDTO));
    }

    @Operation(summary = "内容详情", description = "小程序端获取内容详情，浏览量+1")
    @GetMapping("/{id}")
    public R<ContentDetailDTO> getPublishedContentDetail(@PathVariable Long id) {
        ContentDetailDTO dto = contentService.getPublishedContentDetail(id);
        Long userId = null;
        try {
            userId = SecurityUtils.getCurrentUserId();
        } catch (Exception ignored) {
            // 匿名可读
        }
        if (userId != null && userId > 0) {
            ContentInteractStateDTO state = contentInteractService.getState(id, userId);
            dto.setLiked(state.getLiked());
            dto.setFavorited(state.getFavorited());
            dto.setCommentCount(state.getCommentCount());
        } else {
            dto.setLiked(false);
            dto.setFavorited(false);
            dto.setCommentCount(contentInteractService.listComments(id).size());
        }
        return R.ok(dto);
    }

    @Operation(summary = "互动状态")
    @GetMapping("/{id}/interact")
    public R<ContentInteractStateDTO> getInteract(@PathVariable Long id) {
        Long userId = safeUserId();
        return R.ok(contentInteractService.getState(id, userId));
    }

    @Operation(summary = "点赞切换")
    @PostMapping("/{id}/like")
    public R<ContentInteractStateDTO> toggleLike(@PathVariable Long id) {
        Long userId = requireUserId();
        return R.ok(contentInteractService.toggleLike(id, userId));
    }

    @Operation(summary = "收藏切换")
    @PostMapping("/{id}/favorite")
    public R<ContentInteractStateDTO> toggleFavorite(@PathVariable Long id) {
        Long userId = requireUserId();
        return R.ok(contentInteractService.toggleFavorite(id, userId));
    }

    @Operation(summary = "评论列表")
    @GetMapping("/{id}/comments")
    public R<List<ContentCommentDTO>> listComments(@PathVariable Long id) {
        return R.ok(contentInteractService.listComments(id));
    }

    @Operation(summary = "发表评论")
    @PostMapping("/{id}/comments")
    public R<ContentCommentDTO> addComment(@PathVariable Long id, @RequestBody CommentBody body) {
        Long userId = requireUserId();
        return R.ok(contentInteractService.addComment(
                id, userId, body.getNickname(), body.getAvatar(), body.getContent()));
    }

    private Long requireUserId() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null || userId <= 0) {
            throw new com.miniprogram.common.BusinessException(
                    com.miniprogram.common.ErrorCode.NOT_LOGIN, "请先登录");
        }
        return userId;
    }

    private Long safeUserId() {
        try {
            return SecurityUtils.getCurrentUserId();
        } catch (Exception e) {
            return null;
        }
    }

    @Data
    public static class CommentBody {
        private String content;
        private String nickname;
        private String avatar;
    }
}
