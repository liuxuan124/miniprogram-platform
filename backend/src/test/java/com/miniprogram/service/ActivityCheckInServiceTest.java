package com.miniprogram.service;

import com.miniprogram.common.BusinessException;
import com.miniprogram.dto.CheckInScanResultVO;
import com.miniprogram.entity.Activity;
import com.miniprogram.entity.ActivityCheckIn;
import com.miniprogram.entity.ActivitySignup;
import com.miniprogram.mapper.ActivityCheckInMapper;
import com.miniprogram.mapper.ActivityMapper;
import com.miniprogram.mapper.ActivitySignupMapper;
import com.miniprogram.service.impl.ActivityCheckInServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ActivityCheckInServiceTest {

    private static final Long ACTIVITY_ID = 1L;
    private static final Long OTHER_ACTIVITY_ID = 2L;
    private static final Long USER_ID = 9L;
    private static final Long ADMIN_ID = 88L;
    private static final Long CHECK_IN_ID = 50L;
    private static final String CODE = "abc123checkincode";
    private static final String JSON_PAYLOAD = "{\"t\":\"activity_checkin\",\"c\":\"" + CODE + "\"}";
    private static final String NAME = "张三";
    private static final String PHONE = "13800138000";
    private static final String ACTIVITY_NAME = "春季开放日";

    private ActivityCheckInMapper checkInMapper;
    private ActivitySignupMapper signupMapper;
    private ActivityMapper activityMapper;
    private ActivityCheckInServiceImpl service;

    @BeforeEach
    void setUp() {
        checkInMapper = mock(ActivityCheckInMapper.class);
        signupMapper = mock(ActivitySignupMapper.class);
        activityMapper = mock(ActivityMapper.class);
        service = new ActivityCheckInServiceImpl(signupMapper, activityMapper);
        ReflectionTestUtils.setField(service, "baseMapper", checkInMapper);
    }

    @Test
    void scanVerifySucceedsFirstTime() {
        stubPendingCheckIn();
        stubApprovedSignup();
        stubActivity();
        when(checkInMapper.updateById(any())).thenReturn(1);

        CheckInScanResultVO vo = service.scanVerify(JSON_PAYLOAD, ACTIVITY_ID, ADMIN_ID);

        assertEquals(ACTIVITY_NAME, vo.getActivityName());
        assertEquals(NAME, vo.getSignupName());
        assertEquals(PHONE, vo.getPhone());
        assertEquals(CHECK_IN_ID, vo.getCheckInId());
        assertEquals("VERIFIED", vo.getStatus());

        ArgumentCaptor<ActivityCheckIn> captor = ArgumentCaptor.forClass(ActivityCheckIn.class);
        verify(checkInMapper).updateById(captor.capture());
        ActivityCheckIn saved = captor.getValue();
        assertEquals("VERIFIED", saved.getStatus());
        assertEquals("SCAN", saved.getVerifyMethod());
        assertEquals(ADMIN_ID, saved.getVerifiedBy());
        assertNotNull(saved.getCheckInTime());
    }

    @Test
    void scanVerifyAlreadyVerifiedThrows() {
        ActivityCheckIn checkIn = pendingCheckIn();
        checkIn.setStatus("VERIFIED");
        when(checkInMapper.selectList(any())).thenReturn(List.of(checkIn));
        stubApprovedSignup();
        stubActivity();

        BusinessException ex = assertThrows(BusinessException.class, () ->
                service.scanVerify(CODE, ACTIVITY_ID, ADMIN_ID));

        assertTrue(ex.getMessage().contains("已核销"));
        verify(checkInMapper, never()).updateById(any());
    }

    @Test
    void scanVerifyWrongActivityThrows() {
        stubPendingCheckIn();
        stubApprovedSignup();
        stubActivity();

        BusinessException ex = assertThrows(BusinessException.class, () ->
                service.scanVerify(CODE, OTHER_ACTIVITY_ID, ADMIN_ID));

        assertTrue(ex.getMessage().contains("非本场活动签到码"));
        verify(checkInMapper, never()).updateById(any());
    }

    @Test
    void scanVerifyInvalidStatusThrows() {
        ActivityCheckIn checkIn = pendingCheckIn();
        checkIn.setStatus("INVALID");
        when(checkInMapper.selectList(any())).thenReturn(List.of(checkIn));
        stubApprovedSignup();
        stubActivity();

        BusinessException ex = assertThrows(BusinessException.class, () ->
                service.scanVerify(CODE, ACTIVITY_ID, ADMIN_ID));

        assertTrue(ex.getMessage().contains("已失效"));
        verify(checkInMapper, never()).updateById(any());
    }

    private void stubPendingCheckIn() {
        when(checkInMapper.selectList(any())).thenReturn(List.of(pendingCheckIn()));
    }

    private void stubApprovedSignup() {
        when(signupMapper.selectList(any())).thenReturn(List.of(approvedSignup()));
        when(signupMapper.selectOne(any())).thenReturn(approvedSignup());
    }

    private void stubActivity() {
        Activity activity = new Activity();
        activity.setId(ACTIVITY_ID);
        activity.setName(ACTIVITY_NAME);
        when(activityMapper.selectById(ACTIVITY_ID)).thenReturn(activity);
    }

    private static ActivityCheckIn pendingCheckIn() {
        ActivityCheckIn checkIn = new ActivityCheckIn();
        checkIn.setId(CHECK_IN_ID);
        checkIn.setActivityId(ACTIVITY_ID);
        checkIn.setUserId(USER_ID);
        checkIn.setCheckInCode(CODE);
        checkIn.setStatus("PENDING");
        return checkIn;
    }

    private static ActivitySignup approvedSignup() {
        ActivitySignup signup = new ActivitySignup();
        signup.setId(100L);
        signup.setActivityId(ACTIVITY_ID);
        signup.setUserId(USER_ID);
        signup.setName(NAME);
        signup.setPhone(PHONE);
        signup.setStatus("approved");
        signup.setCheckInCode(CODE);
        return signup;
    }
}
