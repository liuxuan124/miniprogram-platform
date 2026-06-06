package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.member.MemberInfoVO;
import com.miniprogram.dto.member.PointsLogQueryDTO;
import com.miniprogram.dto.member.PointsLogVO;
import com.miniprogram.dto.member.SignInVO;
import com.miniprogram.entity.MemberLevel;
import com.miniprogram.entity.User;
import com.miniprogram.entity.UserCoupon;
import com.miniprogram.mapper.MemberLevelMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.service.MemberPointsLogService;
import com.miniprogram.service.MemberPointsService;
import com.miniprogram.service.UserCouponService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * 会员积分 Service 实现。
 */
@Service
@RequiredArgsConstructor
public class MemberPointsServiceImpl implements MemberPointsService {

    private static final int SIGN_IN_POINTS = 10;

    private final UserMapper userMapper;
    private final MemberLevelMapper memberLevelMapper;
    private final MemberPointsLogService memberPointsLogService;
    private final UserCouponService userCouponService;

    @Override
    public MemberInfoVO getMemberInfo(Long userId) {
        User user = getUser(userId);
        MemberLevel level = resolveLevel(user.getPoints());

        MemberInfoVO vo = new MemberInfoVO();
        vo.setUserId(user.getId());
        vo.setNickname(user.getNickname());
        vo.setAvatarUrl(user.getAvatarUrl());
        vo.setPoints(nullToZero(user.getPoints()));
        vo.setLevelId(level != null ? level.getId() : null);
        vo.setLevelName(level != null ? level.getName() : "普通会员");
        vo.setLevelIcon(level != null ? level.getIcon() : null);
        vo.setDiscountRate(level != null ? level.getDiscountRate() : null);
        vo.setContinuousSignDays(nullToZero(user.getContinuousSignDays()));
        vo.setTodaySigned(LocalDate.now().equals(user.getLastSignDate()));
        vo.setUnusedCouponCount(countUnusedCoupons(userId));
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SignInVO signIn(Long userId) {
        User user = getUser(userId);
        LocalDate today = LocalDate.now();
        if (today.equals(user.getLastSignDate())) {
            throw new BusinessException(400201, "今日已签到");
        }

        LocalDate yesterday = today.minusDays(1);
        int continuousDays = yesterday.equals(user.getLastSignDate())
                ? nullToZero(user.getContinuousSignDays()) + 1
                : 1;
        int totalPoints = nullToZero(user.getPoints()) + SIGN_IN_POINTS;

        user.setPoints(totalPoints);
        user.setContinuousSignDays(continuousDays);
        user.setLastSignDate(today);
        MemberLevel level = resolveLevel(totalPoints);
        if (level != null) {
            user.setLevelId(level.getId());
        }
        userMapper.updateById(user);

        memberPointsLogService.addPointsLog(userId, SIGN_IN_POINTS, "sign_in", "每日签到");

        SignInVO vo = new SignInVO();
        vo.setEarnedPoints(SIGN_IN_POINTS);
        vo.setContinuousSignDays(continuousDays);
        vo.setTotalPoints(totalPoints);
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void addConsumePoints(Long userId, Integer points, String description) {
        changePoints(userId, Math.max(nullToZero(points), 0), "consume", description);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void exchangePoints(Long userId, Integer points, String description) {
        changePoints(userId, -Math.max(nullToZero(points), 0), "exchange", description);
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
}
