package com.miniprogram.service.impl;

import com.miniprogram.entity.MemberLevel;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.MemberBirthdayClaimMapper;
import com.miniprogram.mapper.MemberLevelMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.service.CouponService;
import com.miniprogram.service.MemberPointsLogService;
import com.miniprogram.service.MembershipAccessService;
import com.miniprogram.service.SystemConfigService;
import com.miniprogram.service.UserCouponService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 积分解耦契约：积分路径可写成长 levelId，不得回写付费语义字段 memberExpireAt。
 */
class MemberPointsServiceImplTest {

    @Test
    void changePoints_doesNotTouchMemberExpireAt() {
        Fixture fixture = fixture();
        User user = baseUser();
        user.setMemberExpireAt(null);
        user.setPoints(0);
        when(fixture.userMapper.selectById(9L)).thenReturn(user);

        MemberLevel growth = new MemberLevel();
        growth.setId(2L);
        growth.setMinPoints(100);
        growth.setStatus(1);
        when(fixture.memberLevelMapper.selectList(any())).thenReturn(List.of(growth));

        fixture.service.adminAdjustPoints(9L, 150, "测试加分");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(fixture.userMapper).updateById(captor.capture());
        User saved = captor.getValue();
        assertNull(saved.getMemberExpireAt());
        assertEquals(2L, saved.getLevelId());
        assertEquals(150, saved.getPoints());
    }

    @Test
    void signIn_doesNotTouchMemberExpireAt() {
        Fixture fixture = fixture();
        User user = baseUser();
        user.setMemberExpireAt(null);
        user.setPoints(50);
        user.setLastSignDate(null);
        when(fixture.userMapper.selectById(9L)).thenReturn(user);
        when(fixture.systemConfigService.getConfigValue("points_sign_in_enabled", "1")).thenReturn("1");
        when(fixture.systemConfigService.getConfigValue("points_sign_in", "10")).thenReturn("10");

        MemberLevel growth = new MemberLevel();
        growth.setId(3L);
        growth.setMinPoints(60);
        growth.setStatus(1);
        when(fixture.memberLevelMapper.selectList(any())).thenReturn(List.of(growth));

        fixture.service.signIn(9L);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(fixture.userMapper).updateById(captor.capture());
        User saved = captor.getValue();
        assertNull(saved.getMemberExpireAt());
        assertEquals(3L, saved.getLevelId());
        assertEquals(60, saved.getPoints());
    }

    private static User baseUser() {
        User user = new User();
        user.setId(9L);
        user.setNickname("u9");
        return user;
    }

    private Fixture fixture() {
        UserMapper userMapper = mock(UserMapper.class);
        MemberLevelMapper memberLevelMapper = mock(MemberLevelMapper.class);
        MemberPointsLogService memberPointsLogService = mock(MemberPointsLogService.class);
        UserCouponService userCouponService = mock(UserCouponService.class);
        CouponService couponService = mock(CouponService.class);
        MemberBirthdayClaimMapper memberBirthdayClaimMapper = mock(MemberBirthdayClaimMapper.class);
        SystemConfigService systemConfigService = mock(SystemConfigService.class);
        MembershipAccessService membershipAccessService = mock(MembershipAccessService.class);

        MemberPointsServiceImpl service = new MemberPointsServiceImpl(
                userMapper,
                memberLevelMapper,
                memberPointsLogService,
                userCouponService,
                couponService,
                memberBirthdayClaimMapper,
                systemConfigService,
                membershipAccessService
        );
        return new Fixture(service, userMapper, memberLevelMapper, systemConfigService);
    }

    private record Fixture(
            MemberPointsServiceImpl service,
            UserMapper userMapper,
            MemberLevelMapper memberLevelMapper,
            SystemConfigService systemConfigService
    ) {
    }
}
