package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.ActivitySignupVO;
import com.miniprogram.entity.Activity;
import com.miniprogram.entity.ActivityCheckIn;
import com.miniprogram.entity.ActivitySignup;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.ActivitySignupMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.service.ActivityCheckInService;
import com.miniprogram.service.ActivityService;
import com.miniprogram.service.ActivitySignupService;
import com.miniprogram.service.SmsCodeService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 活动报名 Service 实现
 */
@Slf4j
@Service
public class ActivitySignupServiceImpl extends BaseServiceImpl<ActivitySignupMapper, ActivitySignup> implements ActivitySignupService {

    private static final String SCENE_ACTIVITY_SIGNUP = "activity_signup";
    private static final String STATUS_APPROVED = "approved";
    private static final String STATUS_REJECTED = "rejected";
    private static final String CHECK_IN_PENDING = "PENDING";
    private static final String CHECK_IN_INVALID = "INVALID";
    private static final String CHECK_IN_NONE = "NONE";

    private final ActivityService activityService;
    private final SmsCodeService smsCodeService;
    private final ActivityCheckInService activityCheckInService;
    private final UserMapper userMapper;

    public ActivitySignupServiceImpl(@Lazy ActivityService activityService,
                                     SmsCodeService smsCodeService,
                                     ActivityCheckInService activityCheckInService,
                                     UserMapper userMapper) {
        this.activityService = activityService;
        this.smsCodeService = smsCodeService;
        this.activityCheckInService = activityCheckInService;
        this.userMapper = userMapper;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ActivitySignupVO createSignup(Long activityId, Long userId, String name, String phone,
                                         String session, String smsCode) {
        Activity activity = requireOpenActivity(activityId);

        long existing = this.count(new LambdaQueryWrapper<ActivitySignup>()
                .eq(ActivitySignup::getActivityId, activityId)
                .eq(ActivitySignup::getUserId, userId));
        if (existing > 0) {
            throw new BusinessException("您已报名该活动");
        }

        int quota = activity.getQuota() == null ? 0 : activity.getQuota();
        int signed = activity.getSigned() == null ? 0 : activity.getSigned();
        if (quota > 0 && signed >= quota) {
            throw new BusinessException("名额已满");
        }

        smsCodeService.verifyAndConsume(phone, SCENE_ACTIVITY_SIGNUP, smsCode);

        String checkInCode = UUID.randomUUID().toString().replace("-", "");
        LocalDateTime now = LocalDateTime.now();

        ActivitySignup signup = new ActivitySignup();
        signup.setActivityId(activityId);
        signup.setUserId(userId);
        signup.setName(name);
        signup.setPhone(phone);
        signup.setSession(session);
        signup.setStatus(STATUS_APPROVED);
        signup.setCheckInCode(checkInCode);
        signup.setApprovedAt(now);
        this.save(signup);

        activityService.incrementSigned(activityId);

        ActivityCheckIn checkIn = new ActivityCheckIn();
        checkIn.setActivityId(activityId);
        checkIn.setUserId(userId);
        checkIn.setCheckInCode(checkInCode);
        checkIn.setStatus(CHECK_IN_PENDING);
        activityCheckInService.save(checkIn);

        ActivitySignupVO vo = toVO(signup);
        vo.setCheckInStatus(CHECK_IN_PENDING);
        return vo;
    }

    @Override
    public ActivitySignupVO getMySignup(Long activityId, Long userId) {
        ActivitySignup signup = this.getOne(new LambdaQueryWrapper<ActivitySignup>()
                .eq(ActivitySignup::getActivityId, activityId)
                .eq(ActivitySignup::getUserId, userId), false);
        if (signup == null) {
            return null;
        }
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
        boolean wasApproved = STATUS_APPROVED.equals(signup.getStatus());
        signup.setStatus(Boolean.TRUE.equals(approved) ? STATUS_APPROVED : STATUS_REJECTED);
        this.updateById(signup);

        if (!Boolean.TRUE.equals(approved) && wasApproved) {
            activityService.decrementSigned(signup.getActivityId());
            invalidateCheckIn(signup);
        }
        return toVO(signup);
    }

    private Activity requireOpenActivity(Long activityId) {
        Activity activity = activityService.getById(activityId);
        if (activity == null) {
            throw new BusinessException(5001, "活动不存在");
        }
        if (activity.getStatus() == null || activity.getStatus() != 1) {
            throw new BusinessException("当前活动不可报名");
        }
        return activity;
    }

    private void invalidateCheckIn(ActivitySignup signup) {
        LambdaQueryWrapper<ActivityCheckIn> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(signup.getCheckInCode())) {
            wrapper.eq(ActivityCheckIn::getCheckInCode, signup.getCheckInCode());
        } else {
            wrapper.eq(ActivityCheckIn::getActivityId, signup.getActivityId())
                    .eq(ActivityCheckIn::getUserId, signup.getUserId());
        }
        ActivityCheckIn checkIn = activityCheckInService.getOne(wrapper, false);
        if (checkIn == null) {
            return;
        }
        checkIn.setStatus(CHECK_IN_INVALID);
        activityCheckInService.updateById(checkIn);
    }

    private void fillCheckInStatus(ActivitySignupVO vo, ActivitySignup signup) {
        LambdaQueryWrapper<ActivityCheckIn> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(signup.getCheckInCode())) {
            wrapper.eq(ActivityCheckIn::getCheckInCode, signup.getCheckInCode());
        } else {
            wrapper.eq(ActivityCheckIn::getActivityId, signup.getActivityId())
                    .eq(ActivityCheckIn::getUserId, signup.getUserId());
        }
        ActivityCheckIn checkIn = activityCheckInService.getOne(wrapper, false);
        vo.setCheckInStatus(checkIn != null && StringUtils.hasText(checkIn.getStatus())
                ? checkIn.getStatus()
                : CHECK_IN_NONE);
    }

    private ActivitySignupVO toVO(ActivitySignup signup) {
        ActivitySignupVO vo = new ActivitySignupVO();
        BeanUtils.copyProperties(signup, vo);
        fillCheckInStatus(vo, signup);
        fillUserDisplay(vo, signup);
        return vo;
    }

    private void fillUserDisplay(ActivitySignupVO vo, ActivitySignup signup) {
        if (signup.getUserId() == null) {
            return;
        }
        User user = userMapper.selectById(signup.getUserId());
        if (user == null) {
            return;
        }
        vo.setWxNickname(user.getNickname());
        vo.setOpenidMask(maskOpenid(user.getOpenid()));
    }

    private static String maskOpenid(String openid) {
        if (!StringUtils.hasText(openid)) {
            return null;
        }
        if (openid.length() <= 4) {
            return openid.charAt(0) + "***";
        }
        return openid.substring(0, 4) + "***";
    }
}
