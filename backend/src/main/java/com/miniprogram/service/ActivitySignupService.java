package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.ActivitySignupVO;
import com.miniprogram.entity.ActivitySignup;

public interface ActivitySignupService extends BaseService<ActivitySignup> {
    ActivitySignupVO createSignup(Long activityId, Long userId, String name, String phone, String session, String smsCode);
    ActivitySignupVO getMySignup(Long activityId, Long userId);
    PageResult<ActivitySignupVO> listSignups(Long activityId, String status, Long current, Long size);
    ActivitySignupVO approveSignup(Long id, Boolean approved);
}
