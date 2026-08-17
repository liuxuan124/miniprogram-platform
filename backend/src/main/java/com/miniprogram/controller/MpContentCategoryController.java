package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.ContentCategoryDTO;
import com.miniprogram.service.ContentCategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 小程序端内容分类（公开）
 */
@Tag(name = "小程序-内容分类", description = "内容分类标签（公开）")
@RestController
@RequestMapping("/api/v1/mp/content-categories")
@RequiredArgsConstructor
public class MpContentCategoryController {

    private final ContentCategoryService contentCategoryService;

    @Operation(summary = "启用中的顶级分类", description = "用于内容页顶部分类标签")
    @GetMapping
    public R<List<ContentCategoryDTO>> listEnabledTopCategories() {
        return R.ok(contentCategoryService.listEnabledTopCategories());
    }
}
