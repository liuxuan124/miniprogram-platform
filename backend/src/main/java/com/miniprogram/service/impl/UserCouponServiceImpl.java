package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.member.UserCouponVO;
import com.miniprogram.entity.Coupon;
import com.miniprogram.entity.UserCoupon;
import com.miniprogram.mapper.CouponMapper;
import com.miniprogram.mapper.UserCouponMapper;
import com.miniprogram.service.UserCouponService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserCouponServiceImpl extends BaseServiceImpl<UserCouponMapper, UserCoupon> implements UserCouponService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final UserCouponMapper userCouponMapper;
    private final CouponMapper couponMapper;

    @Override
    public PageResult<UserCouponVO> listUserCoupons(String status, Long page, Long size) {
        LambdaQueryWrapper<UserCoupon> wrapper = new LambdaQueryWrapper<UserCoupon>()
                .eq(status != null && !status.isBlank(), UserCoupon::getStatus, status)
                .orderByDesc(UserCoupon::getCreateTime);
        Page<UserCoupon> userCouponPage = userCouponMapper.selectPage(new Page<>(page, size), wrapper);
        List<UserCouponVO> records = userCouponPage.getRecords().stream()
                .map(userCoupon -> toUserCouponVOForAdmin(userCoupon, couponMapper.selectById(userCoupon.getCouponId())))
                .toList();
        return new PageResult<>(records, userCouponPage.getTotal(), userCouponPage.getCurrent(), userCouponPage.getSize());
    }

    @Override
    public UserCouponVO toUserCouponVOForAdmin(UserCoupon userCoupon, Coupon coupon) {
        UserCouponVO vo = new UserCouponVO();
        vo.setId(userCoupon.getId());
        vo.setCouponId(userCoupon.getCouponId());
        vo.setStatus(userCoupon.getStatus());
        vo.setUsedAt(userCoupon.getUsedAt());
        vo.setOrderId(userCoupon.getOrderId());
        vo.setCreatedAt(userCoupon.getCreateTime() != null ? DATE_TIME_FORMATTER.format(userCoupon.getCreateTime()) : null);
        if (coupon != null) {
            vo.setCouponName(coupon.getName());
            vo.setCouponType(coupon.getType());
            vo.setCouponValue(coupon.getValue());
            vo.setMinOrderAmount(coupon.getMinOrderAmount());
            vo.setStartTime(coupon.getStartTime());
            vo.setEndTime(coupon.getEndTime());
        }
        return vo;
    }
}
