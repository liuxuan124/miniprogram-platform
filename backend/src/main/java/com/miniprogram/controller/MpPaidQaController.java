package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.entity.PaidQaQuestion;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.PaidQaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "小程序-付费问答")
@RestController
@RequestMapping("/api/v1/mp/paid-qa")
@RequiredArgsConstructor
public class MpPaidQaController {

    private final PaidQaService paidQaService;

    @GetMapping
    @Operation(summary = "公开问答列表")
    public R<List<PaidQaQuestion>> list(@RequestParam(defaultValue = "20") int limit) {
        return R.ok(paidQaService.listPublic(limit));
    }

    @GetMapping("/{id}")
    @Operation(summary = "问答详情")
    public R<PaidQaQuestion> detail(@PathVariable Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        return R.ok(paidQaService.getDetail(id, userId));
    }

    @PostMapping
    @Operation(summary = "创建提问（待支付）")
    public R<PaidQaQuestion> create(@RequestBody PaidQaQuestion body) {
        Long userId = SecurityUtils.getCurrentUserId();
        return R.ok(paidQaService.createQuestion(userId, body));
    }

    @Data
    public static class AttachOrderBody {
        private Long orderId;
    }

    @PostMapping("/{id}/attach-order")
    @Operation(summary = "绑定支付订单")
    public R<Void> attachOrder(@PathVariable Long id, @RequestBody AttachOrderBody body) {
        paidQaService.attachOrder(id, body != null ? body.getOrderId() : null);
        return R.ok();
    }
}
