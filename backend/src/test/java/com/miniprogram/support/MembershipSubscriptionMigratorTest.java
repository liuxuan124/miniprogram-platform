package com.miniprogram.support;

import com.miniprogram.entity.MemberSubscription;
import com.miniprogram.entity.Order;
import com.miniprogram.entity.OrderItem;
import com.miniprogram.entity.Product;
import com.miniprogram.entity.SystemConfig;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.MemberSubscriptionMapper;
import com.miniprogram.mapper.OrderItemMapper;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.product.ProductTypes;
import com.miniprogram.service.SystemConfigService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MembershipSubscriptionMigratorTest {

    @Mock
    private UserMapper userMapper;
    @Mock
    private MemberSubscriptionMapper memberSubscriptionMapper;
    @Mock
    private OrderMapper orderMapper;
    @Mock
    private OrderItemMapper orderItemMapper;
    @Mock
    private ProductMapper productMapper;
    @Mock
    private SystemConfigService systemConfigService;

    private MembershipSubscriptionMigrator migrator;

    @BeforeEach
    void setUp() {
        migrator = new MembershipSubscriptionMigrator(
                userMapper,
                memberSubscriptionMapper,
                orderMapper,
                orderItemMapper,
                productMapper,
                systemConfigService
        );
        when(systemConfigService.getConfigValue(
                eq(MembershipSubscriptionMigrator.MARKER_KEY), eq("")))
                .thenReturn("");
        when(productMapper.selectList(any())).thenReturn(Collections.emptyList());
        when(memberSubscriptionMapper.selectCount(any())).thenReturn(0L);
        when(memberSubscriptionMapper.insert(any(MemberSubscription.class))).thenReturn(1);
        when(systemConfigService.getOne(any())).thenReturn(null);
        when(systemConfigService.saveOrUpdate(any(SystemConfig.class))).thenReturn(true);
    }

    @Test
    void pointsOnlyUser_doesNotCreateSubscription() {
        // 仅 level_id、无 expire、无会员订单 → 不进入候选集，不写订购
        when(userMapper.selectList(any())).thenReturn(Collections.emptyList());
        // 即使有人误调 selectById，也不应 insert（候选为空）
        User pointsOnly = new User();
        pointsOnly.setId(999L);
        pointsOnly.setLevelId(3L);
        pointsOnly.setMemberExpireAt(null);
        when(userMapper.selectById(999L)).thenReturn(pointsOnly);

        MembershipSubscriptionMigrator.MigrationStats stats = migrator.migrate(false);

        assertEquals(0, stats.migrated());
        verify(memberSubscriptionMapper, never()).insert(any());
        verify(userMapper, never()).selectById(999L);
        verify(systemConfigService).saveOrUpdate(any(SystemConfig.class));
    }

    @Test
    void userWithExpireAt_createsMigratePlatformSubscription() {
        LocalDateTime expire = LocalDateTime.now().plusDays(30);
        User user = new User();
        user.setId(101L);
        user.setMemberExpireAt(expire);
        user.setLevelId(2L);

        when(userMapper.selectList(any())).thenReturn(List.of(user));
        when(userMapper.selectById(101L)).thenReturn(user);

        MembershipSubscriptionMigrator.MigrationStats stats = migrator.migrate(false);

        assertEquals(1, stats.migrated());
        ArgumentCaptor<MemberSubscription> captor = ArgumentCaptor.forClass(MemberSubscription.class);
        verify(memberSubscriptionMapper).insert(captor.capture());
        MemberSubscription row = captor.getValue();
        assertEquals(101L, row.getUserId());
        assertEquals(MembershipSubscriptionMigrator.SCOPE_PLATFORM, row.getScope());
        assertEquals(MembershipSubscriptionMigrator.SOURCE_MIGRATE, row.getSource());
        assertEquals(expire, row.getExpireAt());
        assertEquals(MembershipSubscriptionMigrator.STATUS_ACTIVE, row.getStatus());
    }

    @Test
    void idempotent_skipsExistingMigrateRow() {
        LocalDateTime expire = LocalDateTime.now().plusDays(10);
        User user = new User();
        user.setId(202L);
        user.setMemberExpireAt(expire);

        when(userMapper.selectList(any())).thenReturn(List.of(user));
        when(memberSubscriptionMapper.selectCount(any())).thenReturn(1L);

        MembershipSubscriptionMigrator.MigrationStats stats = migrator.migrate(false);

        assertEquals(0, stats.migrated());
        assertEquals(1, stats.skipped());
        verify(memberSubscriptionMapper, never()).insert(any());
    }

    @Test
    void secondRun_globalMarkerSkipsEntirely() {
        when(systemConfigService.getConfigValue(
                eq(MembershipSubscriptionMigrator.MARKER_KEY), eq("")))
                .thenReturn(MembershipSubscriptionMigrator.MARKER_VALUE);

        MembershipSubscriptionMigrator.MigrationStats stats = migrator.migrate(false);

        assertTrue(stats.alreadyDone());
        verify(userMapper, never()).selectList(any());
        verify(memberSubscriptionMapper, never()).insert(any());
    }

    @Test
    void paidMembershipOrder_withoutExpire_createsLifetimeSubscription() {
        when(userMapper.selectList(any())).thenReturn(Collections.emptyList());

        Product product = new Product();
        product.setId(9L);
        product.setProductType(ProductTypes.MEMBERSHIP);
        product.setMembershipPlanId(77L);
        when(productMapper.selectList(any())).thenReturn(List.of(product));

        OrderItem item = new OrderItem();
        item.setOrderId(500L);
        item.setProductId(9L);
        when(orderItemMapper.selectList(any())).thenReturn(List.of(item));

        Order order = new Order();
        order.setId(500L);
        order.setUserId(303L);
        order.setStatus("paid");
        when(orderMapper.selectList(any())).thenReturn(List.of(order));

        User user = new User();
        user.setId(303L);
        user.setLevelId(1L);
        user.setMemberExpireAt(null);
        when(userMapper.selectById(303L)).thenReturn(user);

        MembershipSubscriptionMigrator.MigrationStats stats = migrator.migrate(false);

        assertEquals(1, stats.migrated());
        ArgumentCaptor<MemberSubscription> captor = ArgumentCaptor.forClass(MemberSubscription.class);
        verify(memberSubscriptionMapper).insert(captor.capture());
        MemberSubscription row = captor.getValue();
        assertEquals(303L, row.getUserId());
        assertEquals(MembershipSubscriptionMigrator.SOURCE_MIGRATE, row.getSource());
        assertEquals(77L, row.getPlanId());
        assertEquals(500L, row.getOrderId());
        // expire 原为 null → 终身
        assertEquals(null, row.getExpireAt());
        assertEquals(MembershipSubscriptionMigrator.STATUS_ACTIVE, row.getStatus());
    }

    @Test
    void dryRun_doesNotInsertOrWriteMarker() {
        User user = new User();
        user.setId(404L);
        user.setMemberExpireAt(LocalDateTime.now().plusDays(1));
        when(userMapper.selectList(any())).thenReturn(List.of(user));
        when(userMapper.selectById(404L)).thenReturn(user);

        MembershipSubscriptionMigrator.MigrationStats stats = migrator.migrate(true);

        assertEquals(1, stats.migrated());
        verify(memberSubscriptionMapper, never()).insert(any());
        verify(systemConfigService, never()).saveOrUpdate(any(SystemConfig.class));
    }

    @Test
    void migrateTwice_doesNotDuplicateRows() {
        User user = new User();
        user.setId(505L);
        user.setMemberExpireAt(LocalDateTime.now().plusDays(5));
        when(userMapper.selectList(any())).thenReturn(List.of(user));
        when(userMapper.selectById(505L)).thenReturn(user);

        AtomicInteger migrateRows = new AtomicInteger(0);
        when(memberSubscriptionMapper.selectCount(any())).thenAnswer(inv -> (long) migrateRows.get());
        when(memberSubscriptionMapper.insert(any(MemberSubscription.class))).thenAnswer(inv -> {
            migrateRows.incrementAndGet();
            return 1;
        });

        // 第一次写入并记标记
        MembershipSubscriptionMigrator.MigrationStats first = migrator.migrate(false);
        assertEquals(1, first.migrated());
        assertEquals(1, migrateRows.get());

        // 模拟全局标记已写
        when(systemConfigService.getConfigValue(
                eq(MembershipSubscriptionMigrator.MARKER_KEY), eq("")))
                .thenReturn(MembershipSubscriptionMigrator.MARKER_VALUE);

        MembershipSubscriptionMigrator.MigrationStats second = migrator.migrate(false);
        assertTrue(second.alreadyDone());
        assertEquals(1, migrateRows.get());
        verify(memberSubscriptionMapper, times(1)).insert(any());
    }
}
