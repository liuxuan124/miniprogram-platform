package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.member.*;

/**
 * 会员积分 Service
 */
public interface MemberPointsService {

    MemberInfoVO getMemberInfo(Long userId);

    SignInVO signIn(Long userId);

    void addConsumePoints(Long userId, Integer points, String description);

    void exchangePoints(Long userId, Integer points, String description);

    void adminAdjustPoints(Long userId, Integer points, String description);

    PageResult<PointsLogVO> listPointsLog(PointsLogQueryDTO query);

    PageResult<PointsLogVO> listUserPointsLog(Long userId, PointsLogQueryDTO query);

    /** 领取生日礼包 */
    UserCouponVO claimBirthdayGift(Long userId);
}
