package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.ActivitySignupVO;
import com.miniprogram.entity.ActivitySignup;
import com.miniprogram.mapper.ActivitySignupMapper;
import com.miniprogram.service.ActivitySignupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * 活动报名 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ActivitySignupServiceImpl extends BaseServiceImpl<ActivitySignupMapper, ActivitySignup> implements ActivitySignupService {

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ActivitySignupVO createSignup(Long activityId, String name, String phone, String session) {
        ActivitySignup signup = new ActivitySignup();
        signup.setActivityId(activityId);
        signup.setName(name);
        signup.setPhone(phone);
        signup.setSession(session);
        signup.setStatus("pending");
        this.save(signup);
        return toVO(signup);
    }

    @Override
    public PageResult<ActivitySignupVO> listSignups(Long activityId, String status, Long current, Long size) {
        LambdaQueryWrapper<ActivitySignup> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(activityId != null, ActivitySignup::getActivityId, activityId);
        wrapper.eq(StringUtils.hasText(status), ActivitySignup::getStatus, status);
        wrapper.orderByDesc(ActivitySignup::getCreatedAt);

        Page<ActivitySignup> page = this.page(new Page<>(current, size), wrapper);

        PageResult<ActivitySignupVO> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setCurrent(page.getCurrent());
        result.setSize(page.getSize());
        result.setRecords(page.getRecords().stream().map(this::toVO).toList());
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ActivitySignupVO approveSignup(Long id, Boolean approved) {
        ActivitySignup signup = this.getById(id);
        if (signup == null) {
            throw new BusinessException(4001, "报名记录不存在");
        }
        signup.setStatus(approved ? "approved" : "rejected");
        this.updateById(signup);
        return toVO(signup);
    }

    private ActivitySignupVO toVO(ActivitySignup signup) {
        ActivitySignupVO vo = new ActivitySignupVO();
        BeanUtils.copyProperties(signup, vo);
        return vo;
    }
}
