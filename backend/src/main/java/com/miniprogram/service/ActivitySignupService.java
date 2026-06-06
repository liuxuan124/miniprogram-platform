package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.ActivitySignupVO;
import com.miniprogram.entity.ActivitySignup;

public interface ActivitySignupService extends BaseService<ActivitySignup> {
    ActivitySignupVO createSignup(Long activityId, String name, String phone, String session);
    PageResult<ActivitySignupVO> listSignups(Long activityId, String status, Long current, Long size);
    ActivitySignupVO approveSignup(Long id, Boolean approved);
}
