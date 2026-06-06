package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.member.CouponDTO;
import com.miniprogram.dto.member.CouponQueryDTO;
import com.miniprogram.dto.member.CouponVO;
import com.miniprogram.dto.member.UserCouponVO;
import com.miniprogram.entity.Coupon;
import com.miniprogram.entity.UserCoupon;
import com.miniprogram.mapper.CouponMapper;
import com.miniprogram.mapper.UserCouponMapper;
import com.miniprogram.service.CouponService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * 优惠券 Service 实现。
 */
@Service
@RequiredArgsConstructor
public class CouponServiceImpl implements CouponService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final CouponMapper couponMapper;
    private final UserCouponMapper userCouponMapper;

    @Override
    public PageResult<CouponVO> listCoupons(CouponQueryDTO query) {
        LambdaQueryWrapper<Coupon> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(query.getStatus() != null && !query.getStatus().isBlank(), Coupon::getStatus, query.getStatus())
                .orderByDesc(Coupon::getCreateTime);
        Page<Coupon> page = couponMapper.selectPage(new Page<>(query.getPage(), query.getSize()), wrapper);
        List<CouponVO> records = page.getRecords().stream().map(this::toCouponVO).toList();
        return new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    public CouponVO getCouponDetail(Long id) {
        return toCouponVO(getCoupon(id));
    }

    @Override
    public CouponVO createCoupon(CouponDTO dto) {
        Coupon coupon = new Coupon();
        BeanUtils.copyProperties(dto, coupon);
        // 处理 scopeIds: List -> JSON 字符串
        if (dto.getScopeIds() != null && !dto.getScopeIds().isEmpty()) {
            coupon.setScopeIds(dto.getScopeIds().stream()
                    .map(String::valueOf)
                    .reduce((a, b) -> a + "," + b)
                    .orElse(null));
        }
        if (coupon.getStatus() == null) {
            coupon.setStatus("draft");
        }
        couponMapper.insert(coupon);
        return toCouponVO(coupon);
    }

    @Override
    public CouponVO updateCoupon(Long id, CouponDTO dto) {
        Coupon coupon = getCoupon(id);
        BeanUtils.copyProperties(dto, coupon);
        coupon.setId(id);
        // 处理 scopeIds: List -> JSON 字符串
        if (dto.getScopeIds() != null && !dto.getScopeIds().isEmpty()) {
            coupon.setScopeIds(dto.getScopeIds().stream()
                    .map(String::valueOf)
                    .reduce((a, b) -> a + "," + b)
                    .orElse(null));
        }
        couponMapper.updateById(coupon);
        return toCouponVO(coupon);
    }

    @Override
    public void deleteCoupon(Long id) {
        couponMapper.deleteById(id);
    }

    @Override
    public void publishCoupon(Long id) {
        Coupon coupon = getCoupon(id);
        coupon.setStatus("published");
        couponMapper.updateById(coupon);
    }

    @Override
    public void disableCoupon(Long id) {
        Coupon coupon = getCoupon(id);
        coupon.setStatus("disabled");
        couponMapper.updateById(coupon);
    }

    @Override
    public PageResult<CouponVO> listAvailableCoupons(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        LambdaQueryWrapper<Coupon> wrapper = new LambdaQueryWrapper<Coupon>()
                .eq(Coupon::getStatus, "published")
                .le(Coupon::getStartTime, now)
                .ge(Coupon::getEndTime, now)
                .orderByAsc(Coupon::getEndTime);
        Page<Coupon> page = couponMapper.selectPage(new Page<>(1, 50), wrapper);
        List<CouponVO> records = page.getRecords().stream()
                .filter(coupon -> !isIssuedOut(coupon))
                .map(this::toCouponVO)
                .toList();
        return new PageResult<>(records, (long) records.size(), 1L, 50L);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserCouponVO claimCoupon(Long userId, Long couponId) {
        Coupon coupon = getCoupon(couponId);
        LocalDateTime now = LocalDateTime.now();
        if (!"published".equals(coupon.getStatus())
                || coupon.getStartTime().isAfter(now)
                || coupon.getEndTime().isBefore(now)) {
            throw new BusinessException(400201, "优惠券不可领取");
        }
        if (isIssuedOut(coupon)) {
            throw new BusinessException(400201, "优惠券已领完");
        }

        Long claimedCount = userCouponMapper.selectCount(new LambdaQueryWrapper<UserCoupon>()
                .eq(UserCoupon::getUserId, userId)
                .eq(UserCoupon::getCouponId, couponId));
        if (claimedCount >= coupon.getPerUserLimit()) {
            throw new BusinessException(400201, "已达到领取上限");
        }

        UserCoupon userCoupon = new UserCoupon();
        userCoupon.setUserId(userId);
        userCoupon.setCouponId(couponId);
        userCoupon.setStatus("unused");
        userCouponMapper.insert(userCoupon);

        coupon.setUsedCount(nullToZero(coupon.getUsedCount()) + 1);
        couponMapper.updateById(coupon);
        return toUserCouponVO(userCoupon, coupon);
    }

    @Override
    public PageResult<UserCouponVO> listMyCoupons(Long userId, String status) {
        LambdaQueryWrapper<UserCoupon> wrapper = new LambdaQueryWrapper<UserCoupon>()
                .eq(UserCoupon::getUserId, userId)
                .eq(status != null && !status.isBlank(), UserCoupon::getStatus, status)
                .orderByDesc(UserCoupon::getCreateTime);
        Page<UserCoupon> page = userCouponMapper.selectPage(new Page<>(1, 50), wrapper);
        List<UserCouponVO> records = page.getRecords().stream()
                .map(userCoupon -> toUserCouponVO(userCoupon, couponMapper.selectById(userCoupon.getCouponId())))
                .toList();
        return new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize());
    }

    private Coupon getCoupon(Long id) {
        Coupon coupon = couponMapper.selectById(id);
        if (coupon == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
        }
        return coupon;
    }

    private boolean isIssuedOut(Coupon coupon) {
        Integer total = coupon.getTotalCount();
        return total != null && total > 0 && nullToZero(coupon.getUsedCount()) >= total;
    }

    private CouponVO toCouponVO(Coupon coupon) {
        CouponVO vo = new CouponVO();
        BeanUtils.copyProperties(coupon, vo);
        // 处理 scopeIds: 逗号分隔字符串 -> List<Long>
        if (coupon.getScopeIds() != null && !coupon.getScopeIds().isBlank()) {
            List<Long> ids = new ArrayList<>();
            for (String s : coupon.getScopeIds().split(",")) {
                try { ids.add(Long.parseLong(s.trim())); } catch (NumberFormatException ignored) {}
            }
            vo.setScopeIds(ids);
        }
        vo.setCreatedAt(coupon.getCreateTime() != null ? DATE_TIME_FORMATTER.format(coupon.getCreateTime()) : null);
        vo.setUpdatedAt(coupon.getUpdateTime() != null ? DATE_TIME_FORMATTER.format(coupon.getUpdateTime()) : null);
        return vo;
    }

    private UserCouponVO toUserCouponVO(UserCoupon userCoupon, Coupon coupon) {
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

    private int nullToZero(Integer value) {
        return value == null ? 0 : value;
    }
}
