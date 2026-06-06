package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.RefundVO;
import com.miniprogram.service.RefundService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 后台-退款管理
 */
@RestController
@RequestMapping("/api/v1/admin/refunds")
@RequiredArgsConstructor
@Tag(name = "后台-退款管理")
public class AdminRefundController {

    private final RefundService refundService;

    @GetMapping
    @Operation(summary = "退款列表")
    public R<PageResult<RefundVO>> listRefunds(
            @RequestParam(defaultValue = "1") Integer current,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String status) {
        return R.ok(refundService.listRefunds(current, size, status));
    }
}
