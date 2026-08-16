package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.ActivityDTO;
import com.miniprogram.dto.ActivitySignupVO;
import com.miniprogram.dto.ActivityVO;
import com.miniprogram.entity.Activity;
import com.miniprogram.mapper.ActivityMapper;
import com.miniprogram.service.ActivityService;
import com.miniprogram.service.ActivitySignupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.List;

/**
 * 活动管理 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ActivityServiceImpl extends BaseServiceImpl<ActivityMapper, Activity> implements ActivityService {

    private final ActivitySignupService activitySignupService;

    @Override
    public PageResult<ActivityVO> listActivities(String keyword, String type, Integer status, Long current, Long size) {
        refreshExpiredActivities();
        LambdaQueryWrapper<Activity> wrapper = new LambdaQueryWrapper<>();
        wrapper.like(StringUtils.hasText(keyword), Activity::getName, keyword);
        wrapper.eq(StringUtils.hasText(type), Activity::getType, type);
        wrapper.eq(status != null, Activity::getStatus, status);
        wrapper.orderByDesc(Activity::getCreatedAt);

        Page<Activity> page = this.page(new Page<>(current, size), wrapper);

        PageResult<ActivityVO> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setCurrent(page.getCurrent());
        result.setSize(page.getSize());
        result.setRecords(page.getRecords().stream().map(this::toVO).toList());
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ActivityVO createActivity(ActivityDTO dto) {
        Activity activity = new Activity();
        BeanUtils.copyProperties(dto, activity);
        if (activity.getStatus() == null) {
            activity.setStatus(0); // 草稿
        }
        if (activity.getSigned() == null) {
            activity.setSigned(0);
        }
        this.save(activity);
        return toVO(activity);
    }

    @Override
    public ActivityVO getActivityDetail(Long id) {
        refreshExpiredActivities();
        Activity activity = getExistingActivity(id);
        return toVO(activity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ActivityVO updateActivity(Long id, ActivityDTO dto) {
        Activity activity = getExistingActivity(id);

        if (StringUtils.hasText(dto.getName())) {
            activity.setName(dto.getName());
        }
        if (StringUtils.hasText(dto.getType())) {
            activity.setType(dto.getType());
        }
        if (dto.getDate() != null) {
            activity.setDate(dto.getDate());
        }
        if (dto.getVenue() != null) {
            activity.setVenue(dto.getVenue());
        }
        if (dto.getQuota() != null) {
            activity.setQuota(dto.getQuota());
        }
        if (dto.getCover() != null) {
            activity.setCover(dto.getCover());
        }
        if (dto.getDescription() != null) {
            activity.setDescription(dto.getDescription());
        }

        this.updateById(activity);
        return toVO(activity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteActivity(Long id) {
        getExistingActivity(id);
        this.removeById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ActivityVO updateStatus(Long id, Integer status) {
        Activity activity = getExistingActivity(id);
        activity.setStatus(status);
        this.updateById(activity);
        return toVO(activity);
    }

    @Override
    public PageResult<ActivitySignupVO> listSignups(Long activityId, String status, Long current, Long size) {
        return activitySignupService.listSignups(activityId, status, current, size);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ActivitySignupVO approveSignup(Long id, Boolean approved) {
        return activitySignupService.approveSignup(id, approved);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void incrementSigned(Long activityId) {
        Activity activity = getExistingActivity(activityId);
        int signed = activity.getSigned() == null ? 0 : activity.getSigned();
        activity.setSigned(signed + 1);
        this.updateById(activity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void decrementSigned(Long activityId) {
        Activity activity = getExistingActivity(activityId);
        int signed = activity.getSigned() == null ? 0 : activity.getSigned();
        activity.setSigned(Math.max(0, signed - 1));
        this.updateById(activity);
    }

    private Activity getExistingActivity(Long id) {
        Activity activity = this.getById(id);
        if (activity == null) {
            throw new BusinessException(5001, "活动不存在");
        }
        return activity;
    }

    private ActivityVO toVO(Activity activity) {
        ActivityVO vo = new ActivityVO();
        BeanUtils.copyProperties(activity, vo);
        return vo;
    }

    /** 活动日期已过的「报名中/进行中」自动标记为已结束 */
    private void refreshExpiredActivities() {
        LocalDate today = LocalDate.now();
        List<Activity> expired = this.list(new LambdaQueryWrapper<Activity>()
                .lt(Activity::getDate, today)
                .in(Activity::getStatus, 1, 2));
        for (Activity activity : expired) {
            activity.setStatus(3);
            this.updateById(activity);
        }
    }
}
