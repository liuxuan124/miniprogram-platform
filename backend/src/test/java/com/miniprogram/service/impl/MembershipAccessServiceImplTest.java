package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.entity.MemberLevel;
import com.miniprogram.entity.MemberSubscription;
import com.miniprogram.entity.MembershipPlan;
import com.miniprogram.entity.Order;
import com.miniprogram.entity.Product;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.MemberLevelMapper;
import com.miniprogram.mapper.MemberSubscriptionMapper;
import com.miniprogram.mapper.MembershipPlanMapper;
import com.miniprogram.mapper.OrderItemMapper;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.product.ProductTypes;
import com.miniprogram.service.PlanetStatsService;
import com.miniprogram.service.SystemConfigService;
import com.miniprogram.support.FeatureModuleGuard;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * scope 鉴权：平台与星球订购互不顶替；赠送仅开目标星球；legacy 禁止纯积分当终身。
 */
class MembershipAccessServiceImplTest {

    @Test
    void platformActive_planetInactive() {
        Fixture f = fixture(List.of(active("platform", null)));

        assertTrue(f.service.hasPlatformMembership(1L));
        assertFalse(f.service.hasPlanetMembership(1L, "warm-main"));
    }

    @Test
    void planetActive_platformInactive() {
        Fixture f = fixture(List.of(active("planet", "warm-main")));

        assertFalse(f.service.hasPlatformMembership(1L));
        assertTrue(f.service.hasPlanetMembership(1L, "warm-main"));
    }

    @Test
    void giftDoesNotOpenOtherPlanets() {
        Fixture f = fixture(List.of(active("planet", "warm-main")));

        assertTrue(f.service.hasPlanetMembership(1L, "warm-main"));
        assertFalse(f.service.hasPlanetMembership(1L, "warm-read"));
    }

    @Test
    void legacy_pointsOnlyUser_notPlatformMember() {
        // 仅成长 level_id、无 expire、无会员订单 → 禁止当终身
        Fixture f = fixture(List.of());
        User pointsOnly = new User();
        pointsOnly.setId(1L);
        pointsOnly.setLevelId(3L);
        pointsOnly.setMemberExpireAt(null);
        when(f.userMapper.selectById(1L)).thenReturn(pointsOnly);
        when(f.productMapper.selectList(any())).thenReturn(Collections.emptyList());

        assertFalse(f.service.hasPlatformMembership(1L));
    }

    @Test
    void legacy_unexpiredExpireAt_isPlatformMember() {
        Fixture f = fixture(List.of());
        User legacy = new User();
        legacy.setId(1L);
        legacy.setLevelId(null); // expire 即可，不依赖 level_id
        legacy.setMemberExpireAt(LocalDateTime.now().plusDays(10));
        when(f.userMapper.selectById(1L)).thenReturn(legacy);

        assertTrue(f.service.hasPlatformMembership(1L));
    }

    @Test
    void legacy_nullExpire_withPaidMembershipOrder_isLifetimePlatformMember() {
        Fixture f = fixture(List.of());
        User lifetime = new User();
        lifetime.setId(1L);
        lifetime.setLevelId(2L);
        lifetime.setMemberExpireAt(null);
        when(f.userMapper.selectById(1L)).thenReturn(lifetime);

        Product membership = new Product();
        membership.setId(50L);
        membership.setProductType(ProductTypes.MEMBERSHIP);
        when(f.productMapper.selectList(any())).thenReturn(List.of(membership));

        Order paid = new Order();
        paid.setId(200L);
        paid.setUserId(1L);
        paid.setStatus("paid");
        when(f.orderMapper.selectList(any())).thenReturn(List.of(paid));
        when(f.orderItemMapper.selectCount(any())).thenReturn(1L);

        assertTrue(f.service.hasPlatformMembership(1L));
    }

    @Test
    void grant_platformWithGift_writesTwoSubscriptions() {
        Fixture f = fixture(List.of());
        MembershipPlan plan = new MembershipPlan();
        plan.setId(5L);
        plan.setScope("platform");
        plan.setGiftPlanetId("warm-main");
        plan.setGiftPlanetDays(7);
        when(f.membershipPlanMapper.selectById(5L)).thenReturn(plan);
        when(f.memberSubscriptionMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);
        when(f.memberSubscriptionMapper.insert(any(MemberSubscription.class))).thenReturn(1);

        f.service.grantSubscription(1L, 5L, 30, 100L);

        ArgumentCaptor<MemberSubscription> captor = ArgumentCaptor.forClass(MemberSubscription.class);
        verify(f.memberSubscriptionMapper, times(2)).insert(captor.capture());
        List<MemberSubscription> rows = captor.getAllValues();

        MemberSubscription purchase = rows.stream()
                .filter(r -> "purchase".equals(r.getSource()))
                .findFirst()
                .orElseThrow();
        assertEquals("platform", purchase.getScope());
        assertNull(purchase.getPlanetId());
        assertEquals(5L, purchase.getPlanId());
        assertEquals(100L, purchase.getOrderId());
        assertEquals("active", purchase.getStatus());
        assertTrue(purchase.getExpireAt().isAfter(LocalDateTime.now().plusDays(29)));

        MemberSubscription gift = rows.stream()
                .filter(r -> "gift".equals(r.getSource()))
                .findFirst()
                .orElseThrow();
        assertEquals("planet", gift.getScope());
        assertEquals("warm-main", gift.getPlanetId());
        assertEquals(5L, gift.getPlanId());
        assertTrue(gift.getExpireAt().isBefore(LocalDateTime.now().plusDays(8)));
        // 赠送天数不叠加进平台 expire
        assertTrue(purchase.getExpireAt().isBefore(LocalDateTime.now().plusDays(31)));
    }

    @Test
    void grant_doesNotSetLevelIdFromPlan() {
        Fixture f = fixture(List.of());
        MembershipPlan plan = new MembershipPlan();
        plan.setId(5L);
        plan.setScope("platform");
        plan.setGiftPlanetDays(0);
        when(f.membershipPlanMapper.selectById(5L)).thenReturn(plan);
        when(f.memberSubscriptionMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);
        when(f.memberSubscriptionMapper.insert(any(MemberSubscription.class))).thenReturn(1);

        User user = new User();
        user.setId(1L);
        user.setLevelId(99L);
        user.setMemberExpireAt(null);
        when(f.userMapper.selectById(1L)).thenReturn(user);
        when(f.userMapper.updateById(any(User.class))).thenReturn(1);

        f.service.grantSubscription(1L, 5L, 30, 100L);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(f.userMapper).updateById(userCaptor.capture());
        User mirrored = userCaptor.getValue();
        assertEquals(99L, mirrored.getLevelId(), "不得把 plan id 写入成长 level_id");
        assertTrue(mirrored.getMemberExpireAt() != null);
    }

    @Test
    void grant_missingPlan_throwsInsteadOfSilentReturn() {
        Fixture f = fixture(List.of());
        when(f.membershipPlanMapper.selectById(999L)).thenReturn(null);

        assertThrows(BusinessException.class,
                () -> f.service.grantSubscription(1L, 999L, 30, 100L));
    }

    @Test
    void hasBenefit_prefersPlanRightsOverGrowthLevel() {
        MemberSubscription sub = active("platform", null);
        sub.setPlanId(5L);
        Fixture f = fixture(List.of(sub));
        when(f.memberSubscriptionMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(sub);

        MembershipPlan plan = new MembershipPlan();
        plan.setId(5L);
        plan.setScope("platform");
        plan.setRights(List.of("member_discount", "article_free"));
        when(f.membershipPlanMapper.selectById(5L)).thenReturn(plan);

        User user = new User();
        user.setId(1L);
        user.setLevelId(3L);
        when(f.userMapper.selectById(1L)).thenReturn(user);

        MemberLevel growth = new MemberLevel();
        growth.setId(3L);
        growth.setRights(List.of("file_unlock_all"));
        when(f.memberLevelMapper.selectById(3L)).thenReturn(growth);

        assertTrue(f.service.hasBenefit(1L, "member_discount"));
        assertFalse(f.service.hasBenefit(1L, "file_unlock_all"),
                "plan.rights 非空时不得回退成长等级权益");
    }

    @Test
    void hasBenefit_fallsBackToGrowthLevelWhenPlanRightsEmpty() {
        MemberSubscription sub = active("platform", null);
        sub.setPlanId(5L);
        Fixture f = fixture(List.of(sub));
        when(f.memberSubscriptionMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(sub);

        MembershipPlan plan = new MembershipPlan();
        plan.setId(5L);
        plan.setScope("platform");
        plan.setRights(List.of());
        when(f.membershipPlanMapper.selectById(5L)).thenReturn(plan);

        User user = new User();
        user.setId(1L);
        user.setLevelId(3L);
        when(f.userMapper.selectById(1L)).thenReturn(user);

        MemberLevel growth = new MemberLevel();
        growth.setId(3L);
        growth.setRights(List.of("member_discount"));
        when(f.memberLevelMapper.selectById(3L)).thenReturn(growth);

        assertTrue(f.service.hasBenefit(1L, "member_discount"));
    }

    @Test
    void applyShopPrice_prefersPlanDiscountRate() {
        MemberSubscription sub = active("platform", null);
        sub.setPlanId(5L);
        Fixture f = fixture(List.of(sub));
        when(f.memberSubscriptionMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(sub);

        MembershipPlan plan = new MembershipPlan();
        plan.setId(5L);
        plan.setScope("platform");
        plan.setDiscountRate(new java.math.BigDecimal("0.80"));
        plan.setRights(List.of());
        when(f.membershipPlanMapper.selectById(5L)).thenReturn(plan);

        Product product = new Product();
        product.setId(1L);
        product.setMemberFree(0);

        java.math.BigDecimal priced = f.service.applyShopPrice(1L, product, new java.math.BigDecimal("100.00"));
        assertEquals(new java.math.BigDecimal("80.00"), priced);
    }

    @Test
    void grantMembership_deprecated_doesNotMutateUser() {
        Fixture f = fixture(List.of());
        User user = new User();
        user.setId(1L);
        user.setLevelId(1L);
        user.setMemberExpireAt(null);
        when(f.userMapper.selectById(1L)).thenReturn(user);

        f.service.grantMembership(1L, 9L, 30);

        verify(f.userMapper, times(0)).updateById(any(User.class));
        assertEquals(1L, user.getLevelId());
        assertNull(user.getMemberExpireAt());
    }

    private static MemberSubscription active(String scope, String planetId) {
        MemberSubscription row = new MemberSubscription();
        row.setId(10L);
        row.setUserId(1L);
        row.setScope(scope);
        row.setPlanetId(planetId);
        row.setStatus("active");
        row.setExpireAt(LocalDateTime.now().plusDays(30));
        return row;
    }

    @SuppressWarnings("unchecked")
    private Fixture fixture(List<MemberSubscription> rows) {
        UserMapper userMapper = mock(UserMapper.class);
        MemberLevelMapper memberLevelMapper = mock(MemberLevelMapper.class);
        MemberSubscriptionMapper memberSubscriptionMapper = mock(MemberSubscriptionMapper.class);
        MembershipPlanMapper membershipPlanMapper = mock(MembershipPlanMapper.class);
        ProductMapper productMapper = mock(ProductMapper.class);
        OrderMapper orderMapper = mock(OrderMapper.class);
        OrderItemMapper orderItemMapper = mock(OrderItemMapper.class);
        SystemConfigService systemConfigService = mock(SystemConfigService.class);
        FeatureModuleGuard featureModuleGuard = mock(FeatureModuleGuard.class);
        PlanetStatsService planetStatsService = mock(PlanetStatsService.class);

        User bare = new User();
        bare.setId(1L);
        bare.setLevelId(null);
        bare.setMemberExpireAt(null);
        when(userMapper.selectById(1L)).thenReturn(bare);

        when(memberSubscriptionMapper.selectList(any(LambdaQueryWrapper.class))).thenAnswer(inv -> {
            // 生产代码会按 user/scope/status 查库；单测返回同 user 行，由 Impl 再滤 planet/expire
            return rows.stream().filter(r -> Long.valueOf(1L).equals(r.getUserId())).collect(Collectors.toList());
        });
        when(memberSubscriptionMapper.selectCount(any(LambdaQueryWrapper.class))).thenAnswer(inv ->
                rows.stream().filter(r -> "platform".equals(r.getScope())).count());
        when(productMapper.selectList(any())).thenReturn(Collections.emptyList());
        when(orderMapper.selectList(any())).thenReturn(Collections.emptyList());
        when(orderItemMapper.selectCount(any())).thenReturn(0L);

        MembershipAccessServiceImpl service = new MembershipAccessServiceImpl(
                userMapper,
                memberLevelMapper,
                memberSubscriptionMapper,
                membershipPlanMapper,
                productMapper,
                orderMapper,
                orderItemMapper,
                systemConfigService,
                featureModuleGuard,
                planetStatsService,
                new ObjectMapper()
        );
        return new Fixture(service, userMapper, memberLevelMapper, memberSubscriptionMapper, membershipPlanMapper,
                productMapper, orderMapper, orderItemMapper);
    }

    private record Fixture(
            MembershipAccessServiceImpl service,
            UserMapper userMapper,
            MemberLevelMapper memberLevelMapper,
            MemberSubscriptionMapper memberSubscriptionMapper,
            MembershipPlanMapper membershipPlanMapper,
            ProductMapper productMapper,
            OrderMapper orderMapper,
            OrderItemMapper orderItemMapper
    ) {
    }
}
