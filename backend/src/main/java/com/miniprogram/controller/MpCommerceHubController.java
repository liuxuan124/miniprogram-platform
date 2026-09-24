package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.entity.ReferralCommission;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.EmailDeliveryService;
import com.miniprogram.service.PlanetCommerceService;
import com.miniprogram.service.ReferralCommissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "小程序-知识付费扩展")
@RestController
@RequestMapping("/api/v1/mp/commerce")
@RequiredArgsConstructor
public class MpCommerceHubController {

    private final PlanetCommerceService planetCommerceService;
    private final EmailDeliveryService emailDeliveryService;
    private final ReferralCommissionService referralCommissionService;

    @GetMapping("/planet/{planetId}/landing")
    @Operation(summary = "星球售卖落地页数据")
    public R<Map<String, Object>> planetLanding(@PathVariable String planetId) {
        return R.ok(planetCommerceService.landingPayload(planetId));
    }

    @Data
    public static class BindEmailBody {
        private String email;
        private String verifyToken;
    }

    @PostMapping("/email/bind")
    @Operation(summary = "绑定邮箱")
    public R<Void> bindEmail(@RequestBody BindEmailBody body) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (body != null && body.getVerifyToken() != null) {
            emailDeliveryService.verifyEmail(userId, body.getVerifyToken());
        } else {
            emailDeliveryService.bindEmail(userId, body != null ? body.getEmail() : null);
        }
        return R.ok();
    }

    @PostMapping("/email/send-file/{fileId}")
    @Operation(summary = "邮件发送资料下载链接")
    public R<Void> sendFile(@PathVariable Long fileId) {
        emailDeliveryService.sendFileDownloadLink(SecurityUtils.getCurrentUserId(), fileId);
        return R.ok();
    }

    @GetMapping("/referral/commissions")
    @Operation(summary = "我的推广佣金")
    public R<List<ReferralCommission>> commissions(@RequestParam(required = false) String status) {
        return R.ok(referralCommissionService.listForPromoter(SecurityUtils.getCurrentUserId(), status));
    }
}
