package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.member.CouponVO;
import com.miniprogram.dto.member.UserCouponVO;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.CouponService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 小程序端-优惠券接口。
 */
@RestController
@RequestMapping("/api/v1/mp/coupons")
@RequiredArgsConstructor
@Tag(name = "小程序端-优惠券接口")
public class MpCouponController {

    private final CouponService couponService;

    @GetMapping
    @Operation(summary = "可领取优惠券")
    public R<PageResult<CouponVO>> listAvailableCoupons() {
        Long userId = SecurityUtils.getCurrentUserId();
        return R.ok(couponService.listAvailableCoupons(userId));
    }

    @PostMapping("/{id}/claim")
    @Operation(summary = "领取优惠券")
    public R<UserCouponVO> claimCoupon(@PathVariable Long id) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        return R.ok(couponService.claimCoupon(userId, id));
    }

    @GetMapping("/my")
    @Operation(summary = "我的优惠券")
    public R<PageResult<UserCouponVO>> listMyCoupons(@RequestParam(required = false) String status) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        return R.ok(couponService.listMyCoupons(userId, status));
    }
}
