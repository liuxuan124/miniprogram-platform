package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.ActivityDTO;
import com.miniprogram.dto.ActivitySignupVO;
import com.miniprogram.dto.ActivityVO;
import com.miniprogram.entity.Activity;

/**
 * 活动管理 Service
 */
public interface ActivityService extends BaseService<Activity> {

    /**
     * 分页查询活动列表
     */
    PageResult<ActivityVO> listActivities(String keyword, String type, Integer status, Long current, Long size);

    /**
     * 创建活动
     */
    ActivityVO createActivity(ActivityDTO dto);

    /**
     * 获取活动详情
     */
    ActivityVO getActivityDetail(Long id);

    /**
     * 更新活动
     */
    ActivityVO updateActivity(Long id, ActivityDTO dto);

    /**
     * 删除活动
     */
    void deleteActivity(Long id);

    /**
     * 更新活动状态
     */
    ActivityVO updateStatus(Long id, Integer status);

    /**
     * 分页查询活动报名列表
     */
    PageResult<ActivitySignupVO> listSignups(Long activityId, String status, Long current, Long size);

    /**
     * 审核报名
     */
    ActivitySignupVO approveSignup(Long id, Boolean approved);
}
