package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.MiniProgramUserQueryDTO;
import com.miniprogram.dto.MiniProgramUserStatsVO;
import com.miniprogram.dto.MiniProgramUserVO;
import com.miniprogram.entity.ActivitySignup;
import com.miniprogram.entity.FormData;
import com.miniprogram.entity.MemberLevel;
import com.miniprogram.entity.MemberPointsLog;
import com.miniprogram.entity.MiniProgramUser;
import com.miniprogram.entity.Order;
import com.miniprogram.mapper.ActivitySignupMapper;
import com.miniprogram.mapper.FormDataMapper;
import com.miniprogram.mapper.MemberLevelMapper;
import com.miniprogram.mapper.MemberPointsLogMapper;
import com.miniprogram.mapper.MiniProgramUserMapper;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.service.MiniProgramUserService;
import com.miniprogram.user.UserSourceChannels;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 小程序用户管理 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MiniProgramUserServiceImpl extends BaseServiceImpl<MiniProgramUserMapper, MiniProgramUser>
        implements MiniProgramUserService {

    private static final List<String> PAID_ORDER_STATUSES = List.of("paid", "shipped", "completed");

    private final OrderMapper orderMapper;
    private final FormDataMapper formDataMapper;
    private final ActivitySignupMapper activitySignupMapper;
    private final MemberLevelMapper memberLevelMapper;
    private final MemberPointsLogMapper memberPointsLogMapper;

    @Override
    public PageResult<MiniProgramUserVO> listUsers(MiniProgramUserQueryDTO queryDTO) {
        LambdaQueryWrapper<MiniProgramUser> wrapper = buildListWrapper(queryDTO);
        wrapper.orderByDesc(MiniProgramUser::getCreateTime);

        Page<MiniProgramUser> page = this.page(new Page<>(queryDTO.getCurrent(), queryDTO.getSize()), wrapper);
        List<MiniProgramUserVO> records = enrichList(page.getRecords(), false);

        PageResult<MiniProgramUserVO> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setCurrent(page.getCurrent());
        result.setSize(page.getSize());
        result.setRecords(records);
        return result;
    }

    @Override
    public MiniProgramUserVO getUserProfile(Long id) {
        MiniProgramUser user = this.getById(id);
        if (user == null) {
            throw new BusinessException(4001, "用户不存在");
        }
        List<MiniProgramUserVO> list = enrichList(List.of(user), true);
        return list.get(0);
    }

    @Override
    public MiniProgramUserStatsVO getStats() {
        MiniProgramUserStatsVO vo = new MiniProgramUserStatsVO();
        vo.setTotalUsers(this.count());
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        vo.setActiveUsers7d(this.count(new LambdaQueryWrapper<MiniProgramUser>()
                .ge(MiniProgramUser::getLastVisitAt, since)));

        QueryWrapper<Order> orderUsers = new QueryWrapper<>();
        orderUsers.select("COUNT(DISTINCT user_id) AS cnt")
                .in("status", PAID_ORDER_STATUSES)
                .isNotNull("user_id");
        Map<String, Object> userRow = firstMap(orderMapper.selectMaps(orderUsers));
        vo.setUsersWithOrders(asLong(userRow == null ? null : userRow.get("cnt")));

        Long totalOrders = orderMapper.selectCount(new LambdaQueryWrapper<Order>()
                .in(Order::getStatus, PAID_ORDER_STATUSES));
        vo.setTotalOrders(totalOrders == null ? 0L : totalOrders);
        return vo;
    }

    private LambdaQueryWrapper<MiniProgramUser> buildListWrapper(MiniProgramUserQueryDTO queryDTO) {
        LambdaQueryWrapper<MiniProgramUser> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(queryDTO.getKeyword())) {
            String keyword = queryDTO.getKeyword().trim();
            wrapper.and(w -> w.like(MiniProgramUser::getNickname, keyword)
                    .or()
                    .like(MiniProgramUser::getPhone, keyword));
        }
        if (StringUtils.hasText(queryDTO.getPhone())) {
            wrapper.like(MiniProgramUser::getPhone, queryDTO.getPhone().trim());
        }
        if (StringUtils.hasText(queryDTO.getSource())) {
            List<String> values = UserSourceChannels.filterValues(queryDTO.getSource());
            wrapper.in(MiniProgramUser::getSourceChannel, values);
        }
        return wrapper;
    }

    private List<MiniProgramUserVO> enrichList(List<MiniProgramUser> users, boolean withTimeline) {
        if (CollectionUtils.isEmpty(users)) {
            return Collections.emptyList();
        }
        List<Long> userIds = users.stream().map(MiniProgramUser::getId).filter(Objects::nonNull).toList();
        Map<Long, String> levelNames = loadLevelNames(users);
        Map<Long, Integer> orderCounts = countByUserId("mp_order", userIds);
        Map<Long, Integer> formCounts = countByUserId("mp_form_data", userIds);
        Map<Long, Integer> actCounts = countByUserId("mp_activity_signup", userIds);
        Map<Long, BigDecimal> spentMap = sumSpentByUser(userIds);

        List<MiniProgramUserVO> result = new ArrayList<>(users.size());
        for (MiniProgramUser user : users) {
            MiniProgramUserVO vo = toBaseVO(user);
            Long uid = user.getId();
            vo.setLevelName(levelNames.get(user.getLevelId()));
            vo.setOrderCount(orderCounts.getOrDefault(uid, 0));
            vo.setFormCount(formCounts.getOrDefault(uid, 0));
            vo.setActCount(actCounts.getOrDefault(uid, 0));
            vo.setTotalSpent(spentMap.getOrDefault(uid, BigDecimal.ZERO));
            vo.setTags(buildTags(vo));
            if (withTimeline) {
                vo.setActivities(buildActivities(user));
            } else if (user.getLastVisitAt() != null) {
                MiniProgramUserVO.ActivityItem item = new MiniProgramUserVO.ActivityItem();
                item.setContent("最近访问小程序");
                item.setTime(user.getLastVisitAt());
                vo.setActivities(List.of(item));
            }
            result.add(vo);
        }
        return result;
    }

    private MiniProgramUserVO toBaseVO(MiniProgramUser user) {
        MiniProgramUserVO vo = new MiniProgramUserVO();
        BeanUtils.copyProperties(user, vo);
        if (!StringUtils.hasText(user.getSourceChannel())) {
            vo.setSourceChannel(null);
            vo.setSourceChannelLabel("未知");
        } else {
            String code = UserSourceChannels.normalize(user.getSourceChannel());
            vo.setSourceChannel(code);
            vo.setSourceChannelLabel(UserSourceChannels.labelOf(code));
        }
        return vo;
    }

    private Map<Long, String> loadLevelNames(List<MiniProgramUser> users) {
        Set<Long> levelIds = users.stream()
                .map(MiniProgramUser::getLevelId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (levelIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return memberLevelMapper.selectList(new LambdaQueryWrapper<MemberLevel>()
                        .in(MemberLevel::getId, levelIds))
                .stream()
                .collect(Collectors.toMap(MemberLevel::getId, MemberLevel::getName, (a, b) -> a));
    }

    private Map<Long, Integer> countByUserId(String table, List<Long> userIds) {
        if (CollectionUtils.isEmpty(userIds)) {
            return Collections.emptyMap();
        }
        return switch (table) {
            case "mp_order" -> groupCount(orderMapper.selectMaps(new QueryWrapper<Order>()
                    .select("user_id AS uid", "COUNT(*) AS cnt")
                    .in("user_id", userIds)
                    .in("status", PAID_ORDER_STATUSES)
                    .groupBy("user_id")));
            case "mp_form_data" -> groupCount(formDataMapper.selectMaps(new QueryWrapper<FormData>()
                    .select("user_id AS uid", "COUNT(*) AS cnt")
                    .in("user_id", userIds)
                    .eq("deleted", 0)
                    .groupBy("user_id")));
            case "mp_activity_signup" -> groupCount(activitySignupMapper.selectMaps(new QueryWrapper<ActivitySignup>()
                    .select("user_id AS uid", "COUNT(*) AS cnt")
                    .in("user_id", userIds)
                    .groupBy("user_id")));
            default -> Collections.emptyMap();
        };
    }

    private Map<Long, BigDecimal> sumSpentByUser(List<Long> userIds) {
        if (CollectionUtils.isEmpty(userIds)) {
            return Collections.emptyMap();
        }
        List<Map<String, Object>> rows = orderMapper.selectMaps(new QueryWrapper<Order>()
                .select("user_id AS uid", "COALESCE(SUM(pay_amount),0) AS spent")
                .in("user_id", userIds)
                .in("status", PAID_ORDER_STATUSES)
                .groupBy("user_id"));
        Map<Long, BigDecimal> map = new HashMap<>();
        for (Map<String, Object> row : rows) {
            Long uid = asLongNullable(row.get("uid"));
            if (uid == null) uid = asLongNullable(row.get("user_id"));
            if (uid == null) continue;
            Object spent = row.get("spent");
            if (spent == null) spent = row.get("SPENT");
            map.put(uid, spent == null ? BigDecimal.ZERO : new BigDecimal(String.valueOf(spent)));
        }
        return map;
    }

    private Map<Long, Integer> groupCount(List<Map<String, Object>> rows) {
        Map<Long, Integer> map = new HashMap<>();
        if (rows == null) return map;
        for (Map<String, Object> row : rows) {
            Long uid = asLongNullable(row.get("uid"));
            if (uid == null) uid = asLongNullable(row.get("USER_ID"));
            if (uid == null) uid = asLongNullable(row.get("user_id"));
            if (uid == null) continue;
            Object cnt = row.get("cnt");
            if (cnt == null) cnt = row.get("CNT");
            map.put(uid, asLong(cnt).intValue());
        }
        return map;
    }

    private List<String> buildTags(MiniProgramUserVO vo) {
        List<String> tags = new ArrayList<>();
        tags.add(vo.getSourceChannelLabel() == null ? "未知来源" : vo.getSourceChannelLabel());
        if (vo.getLevelName() != null) {
            tags.add(vo.getLevelName());
        }
        if (vo.getOrderCount() != null && vo.getOrderCount() >= 3) {
            tags.add("复购用户");
        } else if (vo.getOrderCount() != null && vo.getOrderCount() > 0) {
            tags.add("已下单");
        }
        if (vo.getLastVisitAt() != null && vo.getLastVisitAt().isAfter(LocalDateTime.now().minusDays(7))) {
            tags.add("近7日活跃");
        }
        if (vo.getCreateTime() != null && vo.getCreateTime().isAfter(LocalDateTime.now().minusDays(7))) {
            tags.add("新用户");
        }
        if (vo.getTotalSpent() != null && vo.getTotalSpent().compareTo(new BigDecimal("500")) >= 0) {
            tags.add("高价值");
        }
        return tags;
    }

    private List<MiniProgramUserVO.ActivityItem> buildActivities(MiniProgramUser user) {
        List<MiniProgramUserVO.ActivityItem> items = new ArrayList<>();
        if (user.getLastVisitAt() != null) {
            MiniProgramUserVO.ActivityItem visit = new MiniProgramUserVO.ActivityItem();
            visit.setContent("最近访问小程序");
            visit.setTime(user.getLastVisitAt());
            items.add(visit);
        }
        List<MemberPointsLog> logs = memberPointsLogMapper.selectList(new LambdaQueryWrapper<MemberPointsLog>()
                .eq(MemberPointsLog::getUserId, user.getId())
                .orderByDesc(MemberPointsLog::getCreateTime)
                .last("LIMIT 8"));
        for (MemberPointsLog logItem : logs) {
            MiniProgramUserVO.ActivityItem item = new MiniProgramUserVO.ActivityItem();
            String desc = StringUtils.hasText(logItem.getDescription()) ? logItem.getDescription() : logItem.getType();
            int pts = logItem.getPoints() == null ? 0 : logItem.getPoints();
            item.setContent((pts >= 0 ? "积分 +" : "积分 ") + pts + (desc == null ? "" : " · " + desc));
            item.setTime(logItem.getCreateTime());
            items.add(item);
        }
        List<Order> recentOrders = orderMapper.selectList(new LambdaQueryWrapper<Order>()
                .eq(Order::getUserId, user.getId())
                .orderByDesc(Order::getCreatedAt)
                .last("LIMIT 5"));
        for (Order order : recentOrders) {
            MiniProgramUserVO.ActivityItem item = new MiniProgramUserVO.ActivityItem();
            item.setContent("订单 " + order.getOrderNo() + " · " + order.getStatus());
            item.setTime(order.getCreatedAt());
            items.add(item);
        }
        items.sort((a, b) -> {
            LocalDateTime ta = a.getTime();
            LocalDateTime tb = b.getTime();
            if (ta == null && tb == null) return 0;
            if (ta == null) return 1;
            if (tb == null) return -1;
            return tb.compareTo(ta);
        });
        if (items.size() > 12) {
            return items.subList(0, 12);
        }
        if (items.isEmpty()) {
            MiniProgramUserVO.ActivityItem empty = new MiniProgramUserVO.ActivityItem();
            empty.setContent("暂无行为记录");
            items.add(empty);
        }
        return items;
    }

    private Map<String, Object> firstMap(List<Map<String, Object>> rows) {
        return CollectionUtils.isEmpty(rows) ? null : rows.get(0);
    }

    private Long asLongNullable(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return n.longValue();
        try {
            String s = String.valueOf(value).trim();
            if (s.isEmpty()) return null;
            return Long.parseLong(s);
        } catch (Exception e) {
            return null;
        }
    }

    private Long asLong(Object value) {
        Long v = asLongNullable(value);
        return v == null ? 0L : v;
    }
}
