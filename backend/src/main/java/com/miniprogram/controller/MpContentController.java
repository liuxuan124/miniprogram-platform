package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.ContentDetailDTO;
import com.miniprogram.dto.ContentQueryDTO;
import com.miniprogram.service.ContentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 小程序端内容控制器（公开接口）
 */
@Tag(name = "小程序-内容", description = "小程序端内容列表/详情（公开）")
@RestController
@RequestMapping("/api/v1/mp/contents")
@RequiredArgsConstructor
public class MpContentController {

    private final ContentService contentService;

    @Operation(summary = "内容列表", description = "小程序端获取已发布内容列表，支持分类/标签筛选")
    @GetMapping
    public R<PageResult<ContentDetailDTO>> listPublishedContents(ContentQueryDTO queryDTO) {
        return R.ok(contentService.listPublishedContents(queryDTO));
    }

    @Operation(summary = "内容详情", description = "小程序端获取内容详情，浏览量+1")
    @GetMapping("/{id}")
    public R<ContentDetailDTO> getPublishedContentDetail(@PathVariable Long id) {
        return R.ok(contentService.getPublishedContentDetail(id));
    }
}
