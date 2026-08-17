package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.PreviewDraftCreateDTO;
import com.miniprogram.dto.PreviewDraftCreateVO;
import com.miniprogram.service.PreviewDraftService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * 管理端：临时草稿预览（手机扫码）
 */
@Tag(name = "临时草稿预览", description = "装修器手机扫码预览快照")
@RestController
@RequestMapping("/api/v1/admin/preview-drafts")
@RequiredArgsConstructor
public class PreviewDraftController {

    private final PreviewDraftService previewDraftService;

    @Operation(summary = "创建临时预览", description = "上传当前草稿 DSL，返回扫码 token；关预览请 DELETE")
    @PostMapping
    @PreAuthorize("hasAuthority('page:list') or hasAuthority('page:update') or hasAuthority('page:create')")
    public R<PreviewDraftCreateVO> create(@Valid @RequestBody PreviewDraftCreateDTO dto) {
        return R.ok(previewDraftService.create(dto));
    }

    @Operation(summary = "作废临时预览", description = "关闭预览窗时调用，立即删除快照释放空间")
    @DeleteMapping("/{token}")
    @PreAuthorize("hasAuthority('page:list') or hasAuthority('page:update') or hasAuthority('page:create')")
    public R<Void> delete(@PathVariable String token) {
        previewDraftService.delete(token);
        return R.ok();
    }
}
