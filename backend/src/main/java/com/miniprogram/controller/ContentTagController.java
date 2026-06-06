package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.ContentTagDTO;
import com.miniprogram.service.ContentTagService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 内容标签管理控制器（管理后台）
 */
@Tag(name = "内容标签管理", description = "内容标签增删改查")
@RestController
@RequestMapping("/api/v1/admin/content-tags")
@RequiredArgsConstructor
public class ContentTagController {

    private final ContentTagService tagService;

    @Operation(summary = "标签列表", description = "获取标签列表，支持关键词搜索，按使用次数降序")
    @GetMapping
    public R<List<ContentTagDTO>> listTags(@RequestParam(required = false) String keyword) {
        return R.ok(tagService.listTags(keyword));
    }

    @Operation(summary = "创建标签")
    @PostMapping
    public R<ContentTagDTO> createTag(@RequestBody TagNameRequest request) {
        return R.ok(tagService.createTag(request.getName(), request.getColor()));
    }

    @Operation(summary = "更新标签")
    @PutMapping("/{id}")
    public R<ContentTagDTO> updateTag(@PathVariable Long id, @RequestBody TagNameRequest request) {
        return R.ok(tagService.updateTag(id, request.getName(), request.getColor()));
    }

    @Operation(summary = "删除标签")
    @DeleteMapping("/{id}")
    public R<Void> deleteTag(@PathVariable Long id) {
        tagService.deleteTag(id);
        return R.ok(null);
    }

    @lombok.Data
    public static class TagNameRequest {
        private String name;
        private String color;
    }
}
