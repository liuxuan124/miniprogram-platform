package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.member.*;

/**
 * 优惠券 Service
 */
public interface CouponService {

    /**
     * 优惠券列表（后台）
     */
    PageResult<CouponVO> listCoupons(CouponQueryDTO query);

    /**
     * 优惠券详情
     */
    CouponVO getCouponDetail(Long id);

    /**
     * 创建优惠券
     */
    CouponVO createCoupon(CouponDTO dto);

    /**
     * 更新优惠券
     */
    CouponVO updateCoupon(Long id, CouponDTO dto);

    /**
     * 删除优惠券
     */
    void deleteCoupon(Long id);

    /**
     * 发布优惠券
     */
    void publishCoupon(Long id);

    /**
     * 停用优惠券
     */
    void disableCoupon(Long id);

    /**
     * 可领取优惠券列表（小程序端）
     */
    PageResult<CouponVO> listAvailableCoupons(Long userId);

    /**
     * 领取优惠券
     */
    UserCouponVO claimCoupon(Long userId, Long couponId);

    /**
     * 我的优惠券列表（小程序端）
     */
    PageResult<UserCouponVO> listMyCoupons(Long userId, String status);
}
