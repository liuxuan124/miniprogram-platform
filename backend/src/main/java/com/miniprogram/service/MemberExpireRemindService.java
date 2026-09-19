package com.miniprogram.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.entity.MemberLevel;
import com.miniprogram.entity.MembershipPlan;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.MemberLevelMapper;
import com.miniprogram.mapper.MembershipPlanMapper;
import com.miniprogram.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberExpireRemindService {

    private static final String LOCK_KEY = "job:lock:member_expire_remind";
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final UserMapper userMapper;
    private final MemberLevelMapper memberLevelMapper;
    private final MembershipPlanMapper membershipPlanMapper;
    private final SubscribeMessageService subscribeMessageService;
    private final StringRedisTemplate stringRedisTemplate;

    /** 定时任务入口：带分布式锁 */
    public int runScheduled() {
        Boolean locked = false;
        try {
            locked = stringRedisTemplate.opsForValue().setIfAbsent(LOCK_KEY, "1", Duration.ofMinutes(30));
        } catch (Exception e) {
            locked = true;
        }
        if (Boolean.FALSE.equals(locked)) {
            return 0;
        }
        return runOnce(false);
    }

    /** 管理后台手动试发：跳过日锁，返回明细 */
    public Map<String, Object> runManualTrial() {
        int sent = runOnce(true);
        Map<String, Object> m = new HashMap<>();
        m.put("enqueued", sent);
        m.put("scene", "member_expire");
        m.put("message", sent > 0
                ? "已入队 " + sent + " 条到期提醒（需用户授权订阅消息，模板场景 member_expire）"
                : "当前无命中到期窗口的会员；请检查到期日与付费档/成长等级的提醒天数配置");
        m.put("status", sent > 0 ? "queued" : "empty");
        return m;
    }

    private int runOnce(boolean force) {
        LocalDate today = LocalDate.now();
        int defaultDays = resolveDefaultRemindDays();
        List<User> users = userMapper.selectList(new LambdaQueryWrapper<User>()
                .isNotNull(User::getMemberExpireAt));
        int sent = 0;
        for (User user : users) {
            if (user.getMemberExpireAt() == null) {
                continue;
            }
            int daysBefore = defaultDays;
            MemberLevel level = user.getLevelId() != null ? memberLevelMapper.selectById(user.getLevelId()) : null;
            if (level != null && level.getExpireRemindDays() != null && level.getExpireRemindDays() > 0) {
                daysBefore = Math.max(1, level.getExpireRemindDays());
            }
            LocalDate expireDate = user.getMemberExpireAt().toLocalDate();
            if (!force && !expireDate.equals(today.plusDays(daysBefore))) {
                continue;
            }
            if (force && expireDate.isBefore(today)) {
                continue;
            }
            if (force) {
                long daysLeft = java.time.temporal.ChronoUnit.DAYS.between(today, expireDate);
                if (daysLeft < 0 || daysLeft > 30) {
                    continue;
                }
            }
            Map<String, Object> data = new HashMap<>();
            data.put("levelName", level != null ? level.getName() : "会员");
            data.put("expireDate", expireDate.format(FMT));
            data.put("remark", "续费享会员权益");
            subscribeMessageService.enqueue(user.getId(), "member_expire", "member:" + user.getId(), data);
            sent++;
        }
        if (sent > 0) {
            log.info("会员到期提醒已入队 {} 条 force={}", sent, force);
        }
        return sent;
    }

    private int resolveDefaultRemindDays() {
        MembershipPlan plan = membershipPlanMapper.selectOne(new LambdaQueryWrapper<MembershipPlan>()
                .eq(MembershipPlan::getScope, "platform")
                .eq(MembershipPlan::getStatus, 1)
                .gt(MembershipPlan::getExpireRemindDays, 0)
                .orderByAsc(MembershipPlan::getSortOrder)
                .last("LIMIT 1"));
        if (plan != null && plan.getExpireRemindDays() != null && plan.getExpireRemindDays() > 0) {
            return plan.getExpireRemindDays();
        }
        return 7;
    }
}
