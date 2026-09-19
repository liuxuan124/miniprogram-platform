package com.miniprogram.support;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
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
import com.miniprogram.tenant.MpTenantLineHandler;
import com.miniprogram.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 一次性：老用户 member_expire_at / 付费会员订单 → 平台订购（source=migrate）。
 * <p>
 * 默认关闭；开启：{@code membership.migrate-subscriptions=true}。
 * 干跑（只打日志不写库）：{@code membership.migrate-subscriptions-dry-run=true}。
 * 全局幂等标记：{@code mp_system_config.membership_subscription_migrated=v1}。
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "membership", name = "migrate-subscriptions", havingValue = "true")
public class MembershipSubscriptionMigrator implements ApplicationRunner {

    public static final String MARKER_KEY = "membership_subscription_migrated";
    public static final String MARKER_VALUE = "v1";
    public static final String SOURCE_MIGRATE = "migrate";
    public static final String SCOPE_PLATFORM = "platform";
    public static final String STATUS_ACTIVE = "active";
    public static final String STATUS_EXPIRED = "expired";

    private static final Set<String> PAID_ORDER_STATUSES = Set.of("paid", "shipped", "completed");

    private final UserMapper userMapper;
    private final MemberSubscriptionMapper memberSubscriptionMapper;
    private final OrderMapper orderMapper;
    private final OrderItemMapper orderItemMapper;
    private final ProductMapper productMapper;
    private final SystemConfigService systemConfigService;

    @Value("${membership.migrate-subscriptions-dry-run:false}")
    private boolean dryRun;

    @Override
    public void run(ApplicationArguments args) {
        try {
            TenantContext.setTenantId(TenantContext.DEFAULT_TENANT_ID);
            MigrationStats stats = migrate(dryRun);
            log.info("MembershipSubscriptionMigrator finished: migrated={}, skipped={}, dryRun={}",
                    stats.migrated(), stats.skipped(), dryRun);
        } catch (Exception e) {
            log.error("MembershipSubscriptionMigrator failed", e);
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * 执行迁移（可供单测直接调用）。
     *
     * @param dryRun true 时只统计/打日志，不写订购与全局标记
     */
    public MigrationStats migrate(boolean dryRun) {
        String marker = systemConfigService.getConfigValue(MARKER_KEY, "");
        if (MARKER_VALUE.equals(marker)) {
            log.info("MembershipSubscriptionMigrator skip: global marker {}={} already set",
                    MARKER_KEY, MARKER_VALUE);
            return new MigrationStats(0, 0, true);
        }

        Set<Long> expireUsers = loadUsersWithMemberExpireAt();
        Map<Long, PaidMembershipHint> paidHints = loadPaidMembershipHints();
        Set<Long> candidateIds = new HashSet<>(expireUsers);
        candidateIds.addAll(paidHints.keySet());

        int migrated = 0;
        int skipped = 0;

        for (Long userId : candidateIds) {
            if (userId == null) {
                continue;
            }
            if (hasMigratePlatformSubscription(userId)) {
                skipped++;
                continue;
            }
            User user = userMapper.selectById(userId);
            if (user == null) {
                skipped++;
                continue;
            }
            // 规则：expire 非空 或 有付费会员订单 → 建订购；否则（纯积分）不建
            boolean hasExpire = user.getMemberExpireAt() != null;
            PaidMembershipHint hint = paidHints.get(userId);
            if (!hasExpire && hint == null) {
                skipped++;
                continue;
            }

            LocalDateTime expireAt = user.getMemberExpireAt();
            Long planId = hint != null ? hint.planId() : null;
            Long orderId = hint != null ? hint.orderId() : null;
            String status = resolveStatus(expireAt);

            if (!dryRun) {
                MemberSubscription row = new MemberSubscription();
                row.setUserId(userId);
                row.setScope(SCOPE_PLATFORM);
                row.setPlanetId(null);
                row.setPlanId(planId);
                row.setOrderId(orderId);
                row.setSource(SOURCE_MIGRATE);
                row.setStartAt(LocalDateTime.now());
                row.setExpireAt(expireAt);
                row.setStatus(status);
                memberSubscriptionMapper.insert(row);
            }
            migrated++;
        }

        // 非候选用户（如仅 level_id）不建订购，计入 skipped 便于日志对照
        // 这里不再全表扫「仅积分」用户，避免噪音；抽检见规格 §9.1

        log.info("MembershipSubscriptionMigrator candidates={}: will migrate N={}, skip M={} (dryRun={})",
                candidateIds.size(), migrated, skipped, dryRun);

        if (!dryRun) {
            writeMarker();
        }
        return new MigrationStats(migrated, skipped, false);
    }

    private Set<Long> loadUsersWithMemberExpireAt() {
        // 不用 LambdaQueryWrapper.select：单测无 TableInfo 缓存会炸；全字段对迁移体量可接受
        List<User> users = userMapper.selectList(new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<User>()
                .isNotNull("member_expire_at"));
        if (users == null) {
            return new HashSet<>();
        }
        return users.stream()
                .map(User::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(HashSet::new));
    }

    /**
     * 跨租户读订单/商品，收集「有付费会员订单」的用户及可选 plan/order 线索。
     */
    private Map<Long, PaidMembershipHint> loadPaidMembershipHints() {
        Map<Long, PaidMembershipHint> hints = new HashMap<>();
        MpTenantLineHandler.runWithoutTenant(() -> {
            // QueryWrapper 字符串列名：避免单测无 MyBatis-Plus lambda 缓存
            List<Product> membershipProducts = productMapper.selectList(
                    new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<Product>()
                            .and(w -> w.eq("product_type", ProductTypes.MEMBERSHIP)
                                    .or()
                                    .like("product_types", ProductTypes.MEMBERSHIP)));
            if (membershipProducts == null || membershipProducts.isEmpty()) {
                return;
            }
            Map<Long, Product> productById = membershipProducts.stream()
                    .filter(p -> p.getId() != null)
                    .filter(p -> ProductTypes.isMembership(p.getProductType(), p.getProductTypes()))
                    .collect(Collectors.toMap(Product::getId, p -> p, (a, b) -> a));
            if (productById.isEmpty()) {
                return;
            }

            List<OrderItem> items = orderItemMapper.selectList(
                    new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<OrderItem>()
                            .in("product_id", productById.keySet()));
            if (items == null || items.isEmpty()) {
                return;
            }
            Set<Long> orderIds = items.stream()
                    .map(OrderItem::getOrderId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            if (orderIds.isEmpty()) {
                return;
            }

            List<Order> paidOrders = orderMapper.selectList(
                    new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<Order>()
                            .in("id", orderIds)
                            .in("status", PAID_ORDER_STATUSES));
            if (paidOrders == null || paidOrders.isEmpty()) {
                return;
            }
            Map<Long, Order> paidById = paidOrders.stream()
                    .filter(o -> o.getId() != null && o.getUserId() != null)
                    .collect(Collectors.toMap(Order::getId, o -> o, (a, b) -> a));

            // 每个用户保留较新订单的 plan 线索
            for (OrderItem item : items) {
                Order order = paidById.get(item.getOrderId());
                if (order == null) {
                    continue;
                }
                Product product = productById.get(item.getProductId());
                Long planId = product != null ? product.getMembershipPlanId() : null;
                PaidMembershipHint existing = hints.get(order.getUserId());
                if (existing == null
                        || (order.getId() != null && existing.orderId() != null
                        && order.getId() > existing.orderId())) {
                    hints.put(order.getUserId(), new PaidMembershipHint(planId, order.getId()));
                }
            }
        });
        return hints;
    }

    private boolean hasMigratePlatformSubscription(Long userId) {
        Long count = memberSubscriptionMapper.selectCount(
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<MemberSubscription>()
                        .eq("user_id", userId)
                        .eq("scope", SCOPE_PLATFORM)
                        .eq("source", SOURCE_MIGRATE));
        return count != null && count > 0;
    }

    private static String resolveStatus(LocalDateTime expireAt) {
        if (expireAt == null) {
            return STATUS_ACTIVE; // 终身
        }
        return expireAt.isAfter(LocalDateTime.now()) ? STATUS_ACTIVE : STATUS_EXPIRED;
    }

    private void writeMarker() {
        SystemConfig config = systemConfigService.getOne(
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SystemConfig>()
                        .eq("config_key", MARKER_KEY)
                        .last("LIMIT 1"));
        if (config == null) {
            config = new SystemConfig();
            config.setConfigKey(MARKER_KEY);
            config.setConfigGroup("membership");
            config.setDescription("平台订购迁移完成标记（勿删）");
            config.setTenantId(TenantContext.getTenantId());
        }
        config.setConfigValue(MARKER_VALUE);
        if (StringUtils.hasText(config.getConfigKey())) {
            systemConfigService.saveOrUpdate(config);
        }
        log.info("MembershipSubscriptionMigrator wrote marker {}={}", MARKER_KEY, MARKER_VALUE);
    }

    public record MigrationStats(int migrated, int skipped, boolean alreadyDone) {
    }

    private record PaidMembershipHint(Long planId, Long orderId) {
    }
}
