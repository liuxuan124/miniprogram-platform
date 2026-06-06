package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.entity.ActivityCheckIn;
import com.miniprogram.mapper.ActivityCheckInMapper;
import com.miniprogram.service.ActivityCheckInService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 活动签到 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ActivityCheckInServiceImpl extends BaseServiceImpl<ActivityCheckInMapper, ActivityCheckIn>
        implements ActivityCheckInService {

    @Override
    public List<ActivityCheckIn> listByActivityId(Long activityId) {
        LambdaQueryWrapper<ActivityCheckIn> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ActivityCheckIn::getActivityId, activityId)
               .orderByDesc(ActivityCheckIn::getCheckInTime);
        return this.list(wrapper);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ActivityCheckIn verifyCheckIn(Long checkInId, String verifyMethod, Long verifiedBy) {
        ActivityCheckIn checkIn = getExistingCheckIn(checkInId);

        if ("VERIFIED".equals(checkIn.getStatus())) {
            throw new BusinessException(500201, "该签到已验证");
        }

        if (!StringUtils.hasText(verifyMethod) ||
                (!"SCAN".equals(verifyMethod) && !"MANUAL".equals(verifyMethod))) {
            throw new BusinessException(500402, "验证方式必须为SCAN或MANUAL");
        }

        checkIn.setVerifyMethod(verifyMethod);
        checkIn.setVerifiedBy(verifiedBy);
        checkIn.setStatus("VERIFIED");
        checkIn.setCheckInTime(LocalDateTime.now());
        this.updateById(checkIn);

        return checkIn;
    }

    @Override
    public Map<String, Object> getActivityStats(Long activityId) {
        LambdaQueryWrapper<ActivityCheckIn> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ActivityCheckIn::getActivityId, activityId);
        long total = this.count(wrapper);

        LambdaQueryWrapper<ActivityCheckIn> verifiedWrapper = new LambdaQueryWrapper<>();
        verifiedWrapper.eq(ActivityCheckIn::getActivityId, activityId)
                       .eq(ActivityCheckIn::getStatus, "VERIFIED");
        long verified = this.count(verifiedWrapper);

        LambdaQueryWrapper<ActivityCheckIn> pendingWrapper = new LambdaQueryWrapper<>();
        pendingWrapper.eq(ActivityCheckIn::getActivityId, activityId)
                      .eq(ActivityCheckIn::getStatus, "PENDING");
        long pending = this.count(pendingWrapper);

        Map<String, Object> stats = new HashMap<>();
        stats.put("activityId", activityId);
        stats.put("total", total);
        stats.put("verified", verified);
        stats.put("pending", pending);
        return stats;
    }

    // ==================== 私有方法 ====================

    private ActivityCheckIn getExistingCheckIn(Long id) {
        ActivityCheckIn checkIn = this.getById(id);
        if (checkIn == null) {
            throw new BusinessException(500401, "签到记录不存在");
        }
        return checkIn;
    }
}
