package com.miniprogram.service;

import com.miniprogram.entity.ActivityCheckIn;

import java.util.List;
import java.util.Map;

/**
 * 活动签到 Service
 */
public interface ActivityCheckInService extends BaseService<ActivityCheckIn> {

    /**
     * 根据活动ID查询签到列表
     */
    List<ActivityCheckIn> listByActivityId(Long activityId);

    /**
     * 验证签到
     */
    ActivityCheckIn verifyCheckIn(Long checkInId, String verifyMethod, Long verifiedBy);

    /**
     * 获取活动签到统计
     */
    Map<String, Object> getActivityStats(Long activityId);
}
