package com.miniprogram.job;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.entity.Coupon;
import com.miniprogram.entity.SubscribeLog;
import com.miniprogram.entity.UserCoupon;
import com.miniprogram.mapper.CouponMapper;
import com.miniprogram.mapper.SubscribeLogMapper;
import com.miniprogram.mapper.UserCouponMapper;
import com.miniprogram.service.SubscribeMessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * 未使用优惠券到期前 24 小时发送订阅消息。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CouponExpireJob {

    private static final String LOCK_KEY = "job:lock:coupon_expire";
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final UserCouponMapper userCouponMapper;
    private final CouponMapper couponMapper;
    private final SubscribeLogMapper subscribeLogMapper;
    private final SubscribeMessageService subscribeMessageService;
    private final StringRedisTemplate stringRedisTemplate;

    @Scheduled(cron = "0 20 * * * *")
    public void remindExpiringCoupons() {
        Boolean locked = false;
        try {
            locked = stringRedisTemplate.opsForValue().setIfAbsent(LOCK_KEY, "1", Duration.ofMinutes(10));
        } catch (Exception e) {
            locked = true;
        }
        if (Boolean.FALSE.equals(locked)) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime until = now.plusHours(24);
        List<UserCoupon> unused = userCouponMapper.selectList(
                new LambdaQueryWrapper<UserCoupon>()
                        .eq(UserCoupon::getStatus, "unused")
                        .last("LIMIT 500"));
        int sent = 0;
        for (UserCoupon uc : unused) {
            if (uc.getCouponId() == null || uc.getUserId() == null) continue;
            Coupon coupon = couponMapper.selectById(uc.getCouponId());
            if (coupon == null) continue;
            LocalDateTime expireAt = coupon.getEndTime();
            if (expireAt == null && coupon.getValidDays() != null && uc.getCreateTime() != null) {
                expireAt = uc.getCreateTime().plusDays(coupon.getValidDays());
            }
            if (expireAt == null || expireAt.isBefore(now) || expireAt.isAfter(until)) continue;
            Long exists = subscribeLogMapper.selectCount(new LambdaQueryWrapper<SubscribeLog>()
                    .eq(SubscribeLog::getScene, "coupon_expire")
                    .eq(SubscribeLog::getBizId, String.valueOf(uc.getId()))
                    .eq(SubscribeLog::getStatus, "sent"));
            if (exists != null && exists > 0) continue;
            subscribeMessageService.enqueue(uc.getUserId(), "coupon_expire", String.valueOf(uc.getId()), Map.of(
                    "couponName", coupon.getName() == null ? "优惠券" : coupon.getName(),
                    "time", expireAt.format(FMT),
                    "tip", "优惠券即将过期"
            ));
            sent++;
        }
        if (sent > 0) {
            log.info("优惠券到期提醒已入队 count={}", sent);
        }
    }
}
