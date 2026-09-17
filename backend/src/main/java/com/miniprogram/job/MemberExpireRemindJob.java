package com.miniprogram.job;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.entity.MemberLevel;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.MemberLevelMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.service.SubscribeMessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class MemberExpireRemindJob {

    private static final String LOCK_KEY = "job:lock:member_expire_remind";
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final UserMapper userMapper;
    private final MemberLevelMapper memberLevelMapper;
    private final SubscribeMessageService subscribeMessageService;
    private final StringRedisTemplate stringRedisTemplate;

    @Scheduled(cron = "0 30 9 * * *")
    public void remindExpiringMembers() {
        Boolean locked = false;
        try {
            locked = stringRedisTemplate.opsForValue().setIfAbsent(LOCK_KEY, "1", Duration.ofMinutes(30));
        } catch (Exception e) {
            locked = true;
        }
        if (Boolean.FALSE.equals(locked)) {
            return;
        }
        LocalDate today = LocalDate.now();
        List<User> users = userMapper.selectList(new LambdaQueryWrapper<User>()
                .isNotNull(User::getMemberExpireAt)
                .isNotNull(User::getLevelId));
        int sent = 0;
        for (User user : users) {
            if (user.getMemberExpireAt() == null || user.getLevelId() == null) {
                continue;
            }
            MemberLevel level = memberLevelMapper.selectById(user.getLevelId());
            int daysBefore = level != null && level.getExpireRemindDays() != null
                    ? Math.max(1, level.getExpireRemindDays()) : 7;
            LocalDate expireDate = user.getMemberExpireAt().toLocalDate();
            if (!expireDate.equals(today.plusDays(daysBefore))) {
                continue;
            }
            Map<String, Object> data = new HashMap<>();
            data.put("levelName", level != null ? level.getName() : "会员");
            data.put("expireDate", expireDate.format(FMT));
            data.put("remark", "续费享会员权益");
            subscribeMessageService.enqueue(user.getId(), "member_expire", "member:" + user.getId(), data);
            sent++;
        }
        if (sent > 0) {
            log.info("会员到期提醒已入队 {} 条", sent);
        }
    }
}
