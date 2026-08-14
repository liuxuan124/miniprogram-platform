package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.dto.CheckInScanResultVO;
import com.miniprogram.entity.Activity;
import com.miniprogram.entity.ActivityCheckIn;
import com.miniprogram.entity.ActivitySignup;
import com.miniprogram.mapper.ActivityCheckInMapper;
import com.miniprogram.mapper.ActivityMapper;
import com.miniprogram.mapper.ActivitySignupMapper;
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

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final String PAYLOAD_TYPE = "activity_checkin";
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_VERIFIED = "VERIFIED";
    private static final String STATUS_INVALID = "INVALID";
    private static final String SIGNUP_APPROVED = "approved";
    private static final String VERIFY_SCAN = "SCAN";

    private final ActivitySignupMapper activitySignupMapper;
    private final ActivityMapper activityMapper;

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

        if (STATUS_VERIFIED.equals(checkIn.getStatus())) {
            throw new BusinessException(500201, "该签到已验证");
        }

        if (!StringUtils.hasText(verifyMethod) ||
                (!VERIFY_SCAN.equals(verifyMethod) && !"MANUAL".equals(verifyMethod))) {
            throw new BusinessException(500402, "验证方式必须为SCAN或MANUAL");
        }

        checkIn.setVerifyMethod(verifyMethod);
        checkIn.setVerifiedBy(verifiedBy);
        checkIn.setStatus(STATUS_VERIFIED);
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
                       .eq(ActivityCheckIn::getStatus, STATUS_VERIFIED);
        long verified = this.count(verifiedWrapper);

        LambdaQueryWrapper<ActivityCheckIn> pendingWrapper = new LambdaQueryWrapper<>();
        pendingWrapper.eq(ActivityCheckIn::getActivityId, activityId)
                      .eq(ActivityCheckIn::getStatus, STATUS_PENDING);
        long pending = this.count(pendingWrapper);

        Map<String, Object> stats = new HashMap<>();
        stats.put("activityId", activityId);
        stats.put("total", total);
        stats.put("verified", verified);
        stats.put("pending", pending);
        return stats;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CheckInScanResultVO scanVerify(String rawPayload, Long expectedActivityId, Long adminUserId) {
        String code = parseCheckInCode(rawPayload);
        ActivityCheckIn checkIn = this.getOne(new LambdaQueryWrapper<ActivityCheckIn>()
                .eq(ActivityCheckIn::getCheckInCode, code), false);
        ActivitySignup signup = findSignupByCode(code);

        if (checkIn == null) {
            if (signup == null) {
                throw new BusinessException("签到码无效");
            }
            checkIn = alignOrCreateCheckIn(signup, code);
        } else if (signup == null) {
            signup = findSignupByActivityUser(checkIn.getActivityId(), checkIn.getUserId());
        }

        if (expectedActivityId != null && !expectedActivityId.equals(checkIn.getActivityId())) {
            throw new BusinessException("非本场活动签到码");
        }

        if (STATUS_VERIFIED.equals(checkIn.getStatus())) {
            String name = signup != null ? signup.getName() : null;
            throw new BusinessException(StringUtils.hasText(name) ? "已核销（" + name + "）" : "已核销");
        }

        if (signup == null || !SIGNUP_APPROVED.equals(signup.getStatus())) {
            throw new BusinessException("报名未通过，无法核销");
        }

        if (STATUS_INVALID.equals(checkIn.getStatus())) {
            throw new BusinessException("签到码已失效");
        }

        checkIn.setStatus(STATUS_VERIFIED);
        checkIn.setCheckInTime(LocalDateTime.now());
        checkIn.setVerifyMethod(VERIFY_SCAN);
        checkIn.setVerifiedBy(adminUserId);
        this.updateById(checkIn);

        Activity activity = activityMapper.selectById(checkIn.getActivityId());
        CheckInScanResultVO vo = new CheckInScanResultVO();
        vo.setActivityName(activity != null ? activity.getName() : null);
        vo.setSignupName(signup.getName());
        vo.setPhone(signup.getPhone());
        vo.setCheckInId(checkIn.getId());
        vo.setStatus(checkIn.getStatus());
        return vo;
    }

    // ==================== 私有方法 ====================

    private ActivityCheckIn getExistingCheckIn(Long id) {
        ActivityCheckIn checkIn = this.getById(id);
        if (checkIn == null) {
            throw new BusinessException(500401, "签到记录不存在");
        }
        return checkIn;
    }

    private String parseCheckInCode(String rawPayload) {
        if (!StringUtils.hasText(rawPayload)) {
            throw new BusinessException("签到码无效");
        }
        String trimmed = rawPayload.trim();
        if (trimmed.startsWith("{")) {
            try {
                JsonNode node = OBJECT_MAPPER.readTree(trimmed);
                String type = node.path("t").asText();
                String code = node.path("c").asText();
                if (PAYLOAD_TYPE.equals(type) && StringUtils.hasText(code)) {
                    return code;
                }
            } catch (Exception ignored) {
                // treat as plain code
            }
        }
        return trimmed;
    }

    private ActivitySignup findSignupByCode(String code) {
        return activitySignupMapper.selectOne(new LambdaQueryWrapper<ActivitySignup>()
                .eq(ActivitySignup::getCheckInCode, code));
    }

    private ActivitySignup findSignupByActivityUser(Long activityId, Long userId) {
        return activitySignupMapper.selectOne(new LambdaQueryWrapper<ActivitySignup>()
                .eq(ActivitySignup::getActivityId, activityId)
                .eq(ActivitySignup::getUserId, userId));
    }

    private ActivityCheckIn alignOrCreateCheckIn(ActivitySignup signup, String code) {
        ActivityCheckIn existing = this.getOne(new LambdaQueryWrapper<ActivityCheckIn>()
                .eq(ActivityCheckIn::getActivityId, signup.getActivityId())
                .eq(ActivityCheckIn::getUserId, signup.getUserId()), false);
        if (existing == null) {
            ActivityCheckIn created = new ActivityCheckIn();
            created.setActivityId(signup.getActivityId());
            created.setUserId(signup.getUserId());
            created.setCheckInCode(code);
            created.setStatus(STATUS_PENDING);
            this.save(created);
            return created;
        }
        if (!code.equals(existing.getCheckInCode())) {
            existing.setCheckInCode(code);
            this.updateById(existing);
        }
        return existing;
    }
}
