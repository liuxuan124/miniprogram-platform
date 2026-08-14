package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.member.MemberInfoVO;
import com.miniprogram.dto.member.PointsLogQueryDTO;
import com.miniprogram.dto.member.PointsLogVO;
import com.miniprogram.dto.member.SignInVO;
import com.miniprogram.dto.member.UserCouponVO;
import com.miniprogram.entity.MemberBirthdayClaim;
import com.miniprogram.entity.MemberLevel;
import com.miniprogram.entity.User;
import com.miniprogram.entity.UserCoupon;
import com.miniprogram.mapper.MemberBirthdayClaimMapper;
import com.miniprogram.mapper.MemberLevelMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.member.MemberBenefitCodes;
import com.miniprogram.service.CouponService;
import com.miniprogram.service.MemberPointsLogService;
import com.miniprogram.service.MemberPointsService;
import com.miniprogram.service.SystemConfigService;
import com.miniprogram.service.UserCouponService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

/**
 * 会员积分 Service 实现。
 */
@Service
@RequiredArgsConstructor
public class MemberPointsServiceImpl implements MemberPointsService {

    private static final int DEFAULT_SIGN_IN_POINTS = 10;

    private final UserMapper userMapper;
    private final MemberLevelMapper memberLevelMapper;
    private final MemberPointsLogService memberPointsLogService;
    private final UserCouponService userCouponService;
    private final CouponService couponService;
    private final MemberBirthdayClaimMapper memberBirthdayClaimMapper;
    private final SystemConfigService systemConfigService;

    @Override
    public MemberInfoVO getMemberInfo(Long userId) {
        User user = getUser(userId);
        MemberLevel level = resolveLevel(user.getPoints());
        List<String> benefits = level != null
                ? MemberBenefitCodes.normalize(level.getRights())
                : Collections.emptyList();

        MemberInfoVO vo = new MemberInfoVO();
        vo.setUserId(user.getId());
        vo.setNickname(user.getNickname());
        vo.setAvatarUrl(user.getAvatarUrl());
        vo.setPoints(nullToZero(user.getPoints()));
        vo.setLevelId(level != null ? level.getId() : null);
        vo.setLevelName(level != null ? level.getName() : "普通会员");
        vo.setLevelIcon(level != null ? level.getIcon() : null);
        vo.setDiscountRate(level != null ? level.getDiscountRate() : null);
        vo.setPointsRate(level != null && level.getPointsRate() != null ? level.getPointsRate() : BigDecimal.ONE);
        vo.setBenefits(benefits);
        vo.setBirthdayGiftAvailable(canClaimBirthdayGift(user, level, benefits));
        vo.setContinuousSignDays(nullToZero(user.getContinuousSignDays()));
        vo.setTodaySigned(LocalDate.now().equals(user.getLastSignDate()));
        vo.setUnusedCouponCount(countUnusedCoupons(userId));
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SignInVO signIn(Long userId) {
        if (!isConfigEnabled("points_sign_in_enabled", true)) {
            throw new BusinessException(400201, "每日签到送积分已关闭");
        }
        int signInPoints = getConfigInt("points_sign_in", DEFAULT_SIGN_IN_POINTS);
        if (signInPoints <= 0) {
            throw new BusinessException(400201, "签到积分未配置或为0");
        }

        User user = getUser(userId);
        LocalDate today = LocalDate.now();
        if (today.equals(user.getLastSignDate())) {
            throw new BusinessException(400201, "今日已签到");
        }

        LocalDate yesterday = today.minusDays(1);
        int continuousDays = yesterday.equals(user.getLastSignDate())
                ? nullToZero(user.getContinuousSignDays()) + 1
                : 1;
        int totalPoints = nullToZero(user.getPoints()) + signInPoints;

        user.setPoints(totalPoints);
        user.setContinuousSignDays(continuousDays);
        user.setLastSignDate(today);
        MemberLevel level = resolveLevel(totalPoints);
        if (level != null) {
            user.setLevelId(level.getId());
        }
        userMapper.updateById(user);

        memberPointsLogService.addPointsLog(userId, signInPoints, "sign_in", "每日签到");

        SignInVO vo = new SignInVO();
        vo.setEarnedPoints(signInPoints);
        vo.setContinuousSignDays(continuousDays);
        vo.setTotalPoints(totalPoints);
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void addConsumePoints(Long userId, Integer points, String description) {
        if (!isConfigEnabled("points_consume_enabled", true)) {
            return;
        }
        changePoints(userId, Math.max(nullToZero(points), 0), "consume", description);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void exchangePoints(Long userId, Integer points, String description) {
        if (!isConfigEnabled("points_exchange_enabled", true)) {
            throw new BusinessException(400201, "积分兑换已关闭");
        }
        int amount = Math.max(nullToZero(points), 0);
        int min = getConfigInt("points_exchange_min", 100);
        if (amount < min) {
            throw new BusinessException(400201, "未达到积分兑换最低门槛：" + min);
        }
        changePoints(userId, -amount, "exchange", description);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void adminAdjustPoints(Long userId, Integer points, String description) {
        changePoints(userId, nullToZero(points), "admin", description);
    }

    @Override
    public PageResult<PointsLogVO> listPointsLog(PointsLogQueryDTO query) {
        return memberPointsLogService.listPointsLogs(query);
    }

    @Override
    public PageResult<PointsLogVO> listUserPointsLog(Long userId, PointsLogQueryDTO query) {
        query.setUserId(userId);
        return listPointsLog(query);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserCouponVO claimBirthdayGift(Long userId) {
        User user = getUser(userId);
        MemberLevel level = resolveLevel(user.getPoints());
        List<String> benefits = level != null
                ? MemberBenefitCodes.normalize(level.getRights())
                : Collections.emptyList();
        if (!canClaimBirthdayGift(user, level, benefits)) {
            if (user.getBirthday() == null) {
                throw new BusinessException(400210, "请先完善生日资料后再领取生日礼包");
            }
            if (level == null || !MemberBenefitCodes.has(benefits, MemberBenefitCodes.BIRTHDAY_GIFT)) {
                throw new BusinessException(400211, "当前等级不支持生日礼包");
            }
            if (!isBirthdayToday(user.getBirthday())) {
                throw new BusinessException(400212, "仅生日当天可领取生日礼包");
            }
            throw new BusinessException(400213, "今年已领取过生日礼包");
        }

        Long couponId = level.getBirthdayCouponId();
        UserCouponVO issued = couponService.issueCoupon(userId, couponId);

        MemberBirthdayClaim claim = new MemberBirthdayClaim();
        claim.setUserId(userId);
        claim.setLevelId(level.getId());
        claim.setCouponId(couponId);
        claim.setUserCouponId(issued.getId());
        claim.setClaimYear(LocalDate.now().getYear());
        memberBirthdayClaimMapper.insert(claim);
        return issued;
    }

    private boolean canClaimBirthdayGift(User user, MemberLevel level, List<String> benefits) {
        if (user.getBirthday() == null || level == null) return false;
        if (!MemberBenefitCodes.has(benefits, MemberBenefitCodes.BIRTHDAY_GIFT)) return false;
        if (level.getBirthdayCouponId() == null) return false;
        if (!isBirthdayToday(user.getBirthday())) return false;
        int year = LocalDate.now().getYear();
        Long count = memberBirthdayClaimMapper.selectCount(new LambdaQueryWrapper<MemberBirthdayClaim>()
                .eq(MemberBirthdayClaim::getUserId, user.getId())
                .eq(MemberBirthdayClaim::getClaimYear, year));
        return count == null || count == 0;
    }

    private boolean isBirthdayToday(LocalDate birthday) {
        LocalDate today = LocalDate.now();
        return birthday.getMonth() == today.getMonth() && birthday.getDayOfMonth() == today.getDayOfMonth();
    }

    private void changePoints(Long userId, Integer delta, String type, String description) {
        User user = getUser(userId);
        int totalPoints = nullToZero(user.getPoints()) + delta;
        if (totalPoints < 0) {
            throw new BusinessException(400201, "积分不足");
        }
        user.setPoints(totalPoints);
        MemberLevel level = resolveLevel(totalPoints);
        if (level != null) {
            user.setLevelId(level.getId());
        }
        userMapper.updateById(user);

        memberPointsLogService.addPointsLog(userId, delta, type, description);
    }

    private User getUser(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
        }
        return user;
    }

    private MemberLevel resolveLevel(Integer points) {
        return memberLevelMapper.selectList(new LambdaQueryWrapper<MemberLevel>()
                        .le(MemberLevel::getMinPoints, nullToZero(points))
                        .eq(MemberLevel::getStatus, 1)
                        .orderByDesc(MemberLevel::getMinPoints)
                        .last("LIMIT 1"))
                .stream()
                .findFirst()
                .orElse(null);
    }

    private Integer countUnusedCoupons(Long userId) {
        Long count = userCouponService.lambdaQuery()
                .eq(UserCoupon::getUserId, userId)
                .eq(UserCoupon::getStatus, "unused")
                .count();
        return count == null ? 0 : count.intValue();
    }

    private int nullToZero(Integer value) {
        return value == null ? 0 : value;
    }

    private int getConfigInt(String key, int defaultValue) {
        try {
            String raw = systemConfigService.getConfigValue(key, String.valueOf(defaultValue));
            if (raw == null || raw.isBlank()) return defaultValue;
            return Integer.parseInt(raw.trim());
        } catch (Exception e) {
            return defaultValue;
        }
    }

    private boolean isConfigEnabled(String key, boolean defaultValue) {
        String raw = systemConfigService.getConfigValue(key, defaultValue ? "1" : "0");
        if (raw == null) return defaultValue;
        String v = raw.trim().toLowerCase();
        return "1".equals(v) || "true".equals(v) || "yes".equals(v) || "on".equals(v);
    }
}
