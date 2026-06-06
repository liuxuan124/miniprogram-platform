package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.member.UserCouponVO;
import com.miniprogram.service.UserCouponService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/user-coupons")
@RequiredArgsConstructor
@Tag(name = "后台-用户优惠券管理")
public class AdminUserCouponController {

    private final UserCouponService userCouponService;

    @GetMapping
    @Operation(summary = "用户优惠券列表")
    public R<PageResult<UserCouponVO>> listUserCoupons(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") Long page,
            @RequestParam(defaultValue = "10") Long size) {
        return R.ok(userCouponService.listUserCoupons(status, page, size));
    }
}
