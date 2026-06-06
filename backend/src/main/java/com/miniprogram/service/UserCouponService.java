package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.member.UserCouponVO;
import com.miniprogram.entity.UserCoupon;

public interface UserCouponService extends BaseService<UserCoupon> {
    PageResult<UserCouponVO> listUserCoupons(String status, Long page, Long size);
    UserCouponVO toUserCouponVOForAdmin(UserCoupon userCoupon, com.miniprogram.entity.Coupon coupon);
}
