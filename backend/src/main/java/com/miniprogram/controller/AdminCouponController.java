package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.member.CouponDTO;
import com.miniprogram.dto.member.CouponQueryDTO;
import com.miniprogram.dto.member.CouponVO;
import com.miniprogram.dto.member.UserCouponVO;
import com.miniprogram.service.CouponService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 后台-优惠券管理。
 */
@RestController
@RequestMapping("/api/v1/admin/coupons")
@RequiredArgsConstructor
@Tag(name = "后台-优惠券管理")
public class AdminCouponController {

    private final CouponService couponService;

    @GetMapping
    @Operation(summary = "优惠券列表")
    public R<PageResult<CouponVO>> listCoupons(CouponQueryDTO query) {
        return R.ok(couponService.listCoupons(query));
    }

    @GetMapping("/{id}")
    @Operation(summary = "优惠券详情")
    public R<CouponVO> getCouponDetail(@PathVariable Long id) {
        return R.ok(couponService.getCouponDetail(id));
    }

    @PostMapping
    @Operation(summary = "创建优惠券")
    public R<CouponVO> createCoupon(@Valid @RequestBody CouponDTO dto) {
        return R.ok(couponService.createCoupon(dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新优惠券")
    public R<CouponVO> updateCoupon(@PathVariable Long id, @Valid @RequestBody CouponDTO dto) {
        return R.ok(couponService.updateCoupon(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除优惠券")
    public R<Void> deleteCoupon(@PathVariable Long id) {
        couponService.deleteCoupon(id);
        return R.ok(null);
    }

    @PutMapping("/{id}/publish")
    @Operation(summary = "发布优惠券")
    public R<Void> publishCoupon(@PathVariable Long id) {
        couponService.publishCoupon(id);
        return R.ok(null);
    }

    @PutMapping("/{id}/disable")
    @Operation(summary = "停用优惠券")
    public R<Void> disableCoupon(@PathVariable Long id) {
        couponService.disableCoupon(id);
        return R.ok(null);
    }
}
