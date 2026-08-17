package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.PreviewDraftVO;
import com.miniprogram.service.PreviewDraftService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 小程序/H5 公开：按 token 读取临时草稿预览
 */
@Tag(name = "临时草稿预览(公开)", description = "手机扫码读取装修器临时快照")
@RestController
@RequestMapping("/api/v1/mp/preview-drafts")
@RequiredArgsConstructor
public class MpPreviewDraftController {

    private final PreviewDraftService previewDraftService;

    @Operation(summary = "读取临时预览", description = "免登录；token 无效或已删除返回失败")
    @GetMapping("/{token}")
    public R<PreviewDraftVO> get(@PathVariable String token) {
        return R.ok(previewDraftService.getByToken(token));
    }
}
