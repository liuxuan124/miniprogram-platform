package com.miniprogram.service;

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
import com.miniprogram.service.impl.ActivitySignupServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class ActivitySignupServiceTest {

    private static final Long ACTIVITY_ID = 1L;
    private static final Long USER_ID = 9L;
    private static final String PHONE = "13800138000";
    private static final String NAME = "张三";
    private static final String SESSION = "上午场";
    private static final String SMS_OK = "123456";
    private static final String SCENE = "activity_signup";

    private ActivitySignupMapper signupMapper;
    private UserMapper userMapper;
    private ActivityService activityService;
    private SmsCodeService smsCodeService;
    private ActivityCheckInService activityCheckInService;
    private ActivitySignupServiceImpl service;

    @BeforeEach
    void setUp() {
        signupMapper = mock(ActivitySignupMapper.class);
        userMapper = mock(UserMapper.class);
        activityService = mock(ActivityService.class);
        smsCodeService = mock(SmsCodeService.class);
        activityCheckInService = mock(ActivityCheckInService.class);
        service = new ActivitySignupServiceImpl(activityService, smsCodeService, activityCheckInService, userMapper);
        ReflectionTestUtils.setField(service, "baseMapper", signupMapper);
    }

    @Test
    void wrongSmsCodeDoesNotPersist() {
        stubOpenActivity(10, 0);
        when(signupMapper.selectCount(any())).thenReturn(0L);
        doThrow(new BusinessException("验证码错误"))
                .when(smsCodeService).verifyAndConsume(PHONE, SCENE, "000000");

        assertThrows(BusinessException.class, () ->
                service.createSignup(ACTIVITY_ID, USER_ID, NAME, PHONE, SESSION, "000000"));

        verify(signupMapper, never()).insert(any());
        verify(activityCheckInService, never()).save(any());
        verify(activityService, never()).incrementSigned(any());
    }

    @Test
    void missingSmsCodeDoesNotPersist() {
        stubOpenActivity(10, 0);
        when(signupMapper.selectCount(any())).thenReturn(0L);
        doThrow(new BusinessException("验证码错误"))
                .when(smsCodeService).verifyAndConsume(PHONE, SCENE, null);

        assertThrows(BusinessException.class, () ->
                service.createSignup(ACTIVITY_ID, USER_ID, NAME, PHONE, SESSION, null));

        verify(signupMapper, never()).insert(any());
    }

    @Test
    void correctSmsAutoApprovesAndGeneratesCheckInCode() {
        stubOpenActivity(10, 2);
        when(signupMapper.selectCount(any())).thenReturn(0L);
        when(signupMapper.insert(any())).thenAnswer(invocation -> {
            ActivitySignup signup = invocation.getArgument(0);
            signup.setId(100L);
            return 1;
        });
        when(activityCheckInService.save(any())).thenReturn(true);

        ActivitySignupVO vo = service.createSignup(
                ACTIVITY_ID, USER_ID, NAME, PHONE, SESSION, SMS_OK);

        assertEquals("approved", vo.getStatus());
        assertNotNull(vo.getCheckInCode());
        assertFalse(vo.getCheckInCode().isBlank());
        assertNotNull(vo.getApprovedAt());
        assertEquals(USER_ID, vo.getUserId());
        assertEquals("PENDING", vo.getCheckInStatus());

        InOrder order = inOrder(activityService, signupMapper, smsCodeService, activityCheckInService);
        order.verify(activityService).getById(ACTIVITY_ID);
        order.verify(signupMapper).selectCount(any());
        order.verify(smsCodeService).verifyAndConsume(PHONE, SCENE, SMS_OK);
        order.verify(signupMapper).insert(any());
        order.verify(activityService).incrementSigned(ACTIVITY_ID);
        order.verify(activityCheckInService).save(any());

        ArgumentCaptor<ActivitySignup> signupCaptor = ArgumentCaptor.forClass(ActivitySignup.class);
        verify(signupMapper).insert(signupCaptor.capture());
        ActivitySignup saved = signupCaptor.getValue();
        assertEquals("approved", saved.getStatus());
        assertEquals(vo.getCheckInCode(), saved.getCheckInCode());
        assertNotNull(saved.getApprovedAt());

        ArgumentCaptor<ActivityCheckIn> checkInCaptor = ArgumentCaptor.forClass(ActivityCheckIn.class);
        verify(activityCheckInService).save(checkInCaptor.capture());
        ActivityCheckIn checkIn = checkInCaptor.getValue();
        assertEquals(ACTIVITY_ID, checkIn.getActivityId());
        assertEquals(USER_ID, checkIn.getUserId());
        assertEquals(vo.getCheckInCode(), checkIn.getCheckInCode());
        assertEquals("PENDING", checkIn.getStatus());
    }

    @Test
    void duplicateSignupThrows() {
        stubOpenActivity(10, 0);
        when(signupMapper.selectCount(any())).thenReturn(1L);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                service.createSignup(ACTIVITY_ID, USER_ID, NAME, PHONE, SESSION, SMS_OK));

        assertTrue(ex.getMessage().contains("已报名"));
        verify(smsCodeService, never()).verifyAndConsume(any(), any(), any());
        verify(signupMapper, never()).insert(any());
        verify(activityCheckInService, never()).save(any());
        verify(activityService, never()).incrementSigned(any());
    }

    @Test
    void fullQuotaRejects() {
        stubOpenActivity(5, 5);
        when(signupMapper.selectCount(any())).thenReturn(0L);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                service.createSignup(ACTIVITY_ID, USER_ID, NAME, PHONE, SESSION, SMS_OK));

        assertTrue(ex.getMessage().contains("名额"));
        verify(smsCodeService, never()).verifyAndConsume(any(), any(), any());
        verify(signupMapper, never()).insert(any());
        verify(activityCheckInService, never()).save(any());
        verify(activityService, never()).incrementSigned(any());
    }

    @Test
    void getMySignupFillsCheckInStatusFromTable() {
        ActivitySignup signup = new ActivitySignup();
        signup.setId(100L);
        signup.setActivityId(ACTIVITY_ID);
        signup.setUserId(USER_ID);
        signup.setStatus("approved");
        signup.setCheckInCode("abc123");
        signup.setApprovedAt(LocalDateTime.now());
        when(signupMapper.selectList(any())).thenReturn(List.of(signup));

        ActivityCheckIn checkIn = new ActivityCheckIn();
        checkIn.setStatus("VERIFIED");
        checkIn.setCheckInCode("abc123");
        when(activityCheckInService.getOne(any(), eq(false))).thenReturn(checkIn);

        ActivitySignupVO vo = service.getMySignup(ACTIVITY_ID, USER_ID);

        assertEquals("abc123", vo.getCheckInCode());
        assertEquals("VERIFIED", vo.getCheckInStatus());
    }

    @Test
    void rejectApprovedSignupDecrementsSignedAndInvalidatesCheckIn() {
        ActivitySignup signup = new ActivitySignup();
        signup.setId(100L);
        signup.setActivityId(ACTIVITY_ID);
        signup.setUserId(USER_ID);
        signup.setStatus("approved");
        signup.setCheckInCode("abc123");
        when(signupMapper.selectById(100L)).thenReturn(signup);
        when(signupMapper.updateById(any())).thenReturn(1);

        ActivityCheckIn checkIn = new ActivityCheckIn();
        checkIn.setId(50L);
        checkIn.setStatus("PENDING");
        checkIn.setCheckInCode("abc123");
        when(activityCheckInService.getOne(any(), eq(false))).thenReturn(checkIn);
        when(activityCheckInService.updateById(any())).thenReturn(true);

        ActivitySignupVO vo = service.approveSignup(100L, false);

        assertEquals("rejected", vo.getStatus());
        verify(activityService).decrementSigned(ACTIVITY_ID);
        ArgumentCaptor<ActivityCheckIn> checkInCaptor = ArgumentCaptor.forClass(ActivityCheckIn.class);
        verify(activityCheckInService).updateById(checkInCaptor.capture());
        assertEquals("INVALID", checkInCaptor.getValue().getStatus());
    }

    @Test
    void listSignupsFillsCheckInStatusFromTable() {
        ActivitySignup signup = approvedSignup("abc123");
        stubSignupPage(signup);

        ActivityCheckIn checkIn = new ActivityCheckIn();
        checkIn.setStatus("VERIFIED");
        checkIn.setCheckInCode("abc123");
        when(activityCheckInService.getOne(any(), eq(false))).thenReturn(checkIn);

        PageResult<ActivitySignupVO> result = service.listSignups(ACTIVITY_ID, null, 1L, 10L);

        assertEquals(1, result.getRecords().size());
        assertEquals("VERIFIED", result.getRecords().get(0).getCheckInStatus());
        assertEquals("abc123", result.getRecords().get(0).getCheckInCode());
    }

    @Test
    void listSignupsFillsNoneWhenCheckInMissing() {
        stubSignupPage(approvedSignup("abc123"));
        when(activityCheckInService.getOne(any(), eq(false))).thenReturn(null);

        PageResult<ActivitySignupVO> result = service.listSignups(ACTIVITY_ID, null, 1L, 10L);

        assertEquals("NONE", result.getRecords().get(0).getCheckInStatus());
    }

    @Test
    void listSignupsFillsWxNicknameAndOpenidMask() {
        stubSignupPage(approvedSignup("abc123"));
        when(activityCheckInService.getOne(any(), eq(false))).thenReturn(null);

        User user = new User();
        user.setId(USER_ID);
        user.setNickname("微信用户");
        user.setOpenid("oABC123xyz");
        when(userMapper.selectById(USER_ID)).thenReturn(user);

        PageResult<ActivitySignupVO> result = service.listSignups(ACTIVITY_ID, null, 1L, 10L);

        ActivitySignupVO vo = result.getRecords().get(0);
        assertEquals("微信用户", vo.getWxNickname());
        assertEquals("oABC***", vo.getOpenidMask());
    }

    private void stubSignupPage(ActivitySignup signup) {
        when(signupMapper.selectPage(any(), any())).thenAnswer(invocation -> {
            Page<ActivitySignup> page = invocation.getArgument(0);
            page.setRecords(List.of(signup));
            page.setTotal(1);
            return page;
        });
    }

    private static ActivitySignup approvedSignup(String checkInCode) {
        ActivitySignup signup = new ActivitySignup();
        signup.setId(100L);
        signup.setActivityId(ACTIVITY_ID);
        signup.setUserId(USER_ID);
        signup.setStatus("approved");
        signup.setCheckInCode(checkInCode);
        signup.setPhone(PHONE);
        signup.setName(NAME);
        return signup;
    }

    private void stubOpenActivity(int quota, int signed) {
        when(activityService.getById(ACTIVITY_ID)).thenReturn(openActivity(quota, signed));
    }

    private static Activity openActivity(int quota, int signed) {
        Activity activity = new Activity();
        activity.setId(ACTIVITY_ID);
        activity.setStatus(1);
        activity.setQuota(quota);
        activity.setSigned(signed);
        return activity;
    }
}
