package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.member.*;

/**
 * 会员积分 Service
 */
public interface MemberPointsService {

    /**
     * 获取会员信息
     */
    MemberInfoVO getMemberInfo(Long userId);

    /**
     * 签到
     */
    SignInVO signIn(Long userId);

    /**
     * 消费积分（订单完成后调用）
     */
    void addConsumePoints(Long userId, Integer points, String description);

    /**
     * 积分兑换（扣减积分）
     */
    void exchangePoints(Long userId, Integer points, String description);

    /**
     * 管理员调整积分
     */
    void adminAdjustPoints(Long userId, Integer points, String description);

    /**
     * 查询积分日志（后台）
     */
    PageResult<PointsLogVO> listPointsLog(PointsLogQueryDTO query);

    /**
     * 查询积分日志（小程序端）
     */
    PageResult<PointsLogVO> listUserPointsLog(Long userId, PointsLogQueryDTO query);
}
