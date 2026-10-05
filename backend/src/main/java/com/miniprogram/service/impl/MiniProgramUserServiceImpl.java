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
import com.miniprogram.entity.MembershipPlan;
import com.miniprogram.entity.MemberSubscription;
import com.miniprogram.entity.MiniProgramUser;
import com.miniprogram.entity.Order;
import com.miniprogram.mapper.ActivitySignupMapper;
import com.miniprogram.mapper.FormDataMapper;
import com.miniprogram.mapper.MemberLevelMapper;
import com.miniprogram.mapper.MemberPointsLogMapper;
import com.miniprogram.mapper.MembershipPlanMapper;
import com.miniprogram.mapper.MemberSubscriptionMapper;
import com.miniprogram.mapper.MiniProgramUserMapper;
import com.miniprogram.entity.MemberTag;
import com.miniprogram.entity.UserMemberTag;
import com.miniprogram.mapper.MemberTagMapper;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.mapper.UserMemberTagMapper;
import com.miniprogram.security.SecurityUtils;
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
import java.util.LinkedHashMap;
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

    /**
     * V121 列表排序白名单：前端列头点一下就换排序，必须在服务端做。
     * <p>key = 前端传的 sortBy，value = 直接拼进 SQL 的表达式。
     * <p>为什么用白名单而不是把 orderBy 原样透传：orderBy 是拼进 SQL 的裸字符串，
     * 不校验就是注入点。方向同理，只放行 asc/desc。
     * <p>累计消费 / 订单数不是 mp_user 的列，是 enrich 时用子查询算的，
     * 所以排序也必须用同样的子查询表达式 —— 两处口径必须一致，
     * 否则会出现「按消费排序但消费列显示的是另一个数」。
     */
    private static final Map<String, String> SORT_EXPRESSIONS = Map.of(
            "points", "mp_user.points",
            "spend", "(SELECT COALESCE(SUM(o.pay_amount),0) FROM mp_order o"
                    + " WHERE o.user_id = mp_user.id AND o.status IN ('paid','shipped','completed'))",
            "orders", "(SELECT COUNT(1) FROM mp_order o"
                    + " WHERE o.user_id = mp_user.id AND o.status IN ('paid','shipped','completed'))",
            "lastVisit", "mp_user.last_visit_at",
            "created", "mp_user.create_time");

    private final OrderMapper orderMapper;
    private final FormDataMapper formDataMapper;
    private final ActivitySignupMapper activitySignupMapper;
    private final MemberLevelMapper memberLevelMapper;
    private final MemberPointsLogMapper memberPointsLogMapper;
    private final MemberTagMapper memberTagMapper;
    private final UserMemberTagMapper userMemberTagMapper;
    private final MemberSubscriptionMapper memberSubscriptionMapper;
    private final MembershipPlanMapper membershipPlanMapper;

    @Override
    public PageResult<MiniProgramUserVO> listUsers(MiniProgramUserQueryDTO queryDTO) {
        LambdaQueryWrapper<MiniProgramUser> wrapper = buildListWrapper(queryDTO);
        applySort(wrapper, queryDTO.getOrderBy(), queryDTO.getOrderDir());

        Page<MiniProgramUser> page = this.page(new Page<>(queryDTO.getCurrent(), queryDTO.getSize()), wrapper);
        List<MiniProgramUserVO> records = enrichList(page.getRecords(), false);

        PageResult<MiniProgramUserVO> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setCurrent(page.getCurrent());
        result.setSize(page.getSize());
        result.setRecords(records);
        return result;
    }

    /**
     * V121：按白名单应用排序。
     * <p>未指定或不在白名单内时回落到「注册时间倒序」，与 V121 之前的行为一致 ——
     * 排序是新增能力，绝不能顺手改掉列表原有的默认顺序。
     * <p>用 last() 而不是 orderBy：累计消费/订单数的排序键是子查询表达式，
     * orderBy 走 Lambda 字段映射拼不出这个形状。last() 的内容全部来自上面的常量表，
     * 前端输入无法到达这里。
     */
    private void applySort(LambdaQueryWrapper<MiniProgramUser> wrapper, String sortBy, String orderDir) {
        String expression = StringUtils.hasText(sortBy) ? SORT_EXPRESSIONS.get(sortBy.trim()) : null;
        if (expression == null) {
            wrapper.orderByDesc(MiniProgramUser::getCreateTime);
            return;
        }
        String direction = "asc".equalsIgnoreCase(orderDir) ? "ASC" : "DESC";
        // 次级排序键固定 id：同一批同值用户翻页时不会重复/漏掉
        wrapper.last("ORDER BY " + expression + " " + direction + ", mp_user.id ASC");
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

        // V121 环比基准：第 7~14 天前的上一个 7 日窗口。没有它前端做不出「较上周 +12%」。
        // 上界用 since（不含）而不是 now，避免与本窗口重叠导致两个数字都虚高。
        LocalDateTime prevSince = LocalDateTime.now().minusDays(14);
        vo.setActiveUsersPrev7d(this.count(new LambdaQueryWrapper<MiniProgramUser>()
                .ge(MiniProgramUser::getLastVisitAt, prevSince)
                .lt(MiniProgramUser::getLastVisitAt, since)));

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

    private LambdaQueryWrapper<MiniProgramUser> buildListWrapper(MiniProgramUserQueryDTO queryDTO) {        LambdaQueryWrapper<MiniProgramUser> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(MiniProgramUser::getTenantId, SecurityUtils.getCurrentTenantId());
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
        // V116 账号来源筛选：real 真实注册 / system 后台配置 / test 联调测试
        if (StringUtils.hasText(queryDTO.getAccountType())) {
            wrapper.eq(MiniProgramUser::getAccountType, queryDTO.getAccountType().trim());
        }
        // V119 付费会员筛选：真源 mp_member_subscription（scope=platform 且未过期）。
        // 用 EXISTS 而不是 member_expire_at —— 后者是赠礼镜像字段，可能与订购表不一致。
        if (StringUtils.hasText(queryDTO.getPayStatus())) {
            String pay = queryDTO.getPayStatus().trim();
            String activePlatformSub = "SELECT 1 FROM mp_member_subscription s"
                    + " WHERE s.user_id = mp_user.id AND s.scope = 'platform' AND s.status = 'active'"
                    + " AND (s.expire_at IS NULL OR s.expire_at > NOW())";
            if ("paid".equalsIgnoreCase(pay)) {
                wrapper.exists(activePlatformSub);
            } else if ("none".equalsIgnoreCase(pay)) {
                wrapper.notExists(activePlatformSub);
            }
        }
        // V119 角色标签筛选：下推到 SQL，避免前端只过滤当前页导致「表格空但 total 仍是全量」
        if (queryDTO.getRoleTagId() != null) {
            wrapper.exists("SELECT 1 FROM mp_user_member_tag t WHERE t.user_id = mp_user.id AND t.tag_id = {0}",
                    queryDTO.getRoleTagId());
        }
        // V119 重复账号筛选：手机号在 mp_user 内出现 ≥2 次。
        // inSql 子查询走的是同一张表，MyBatis-Plus 的 @TableLogic 不会作用在裸 SQL 上，
        // 所以这里显式带 deleted = 0，与 listDuplicateGroups 的口径保持一致。
        if (Boolean.TRUE.equals(queryDTO.getDuplicateOnly())) {
            wrapper.inSql(MiniProgramUser::getPhone,
                    "SELECT phone FROM mp_user WHERE deleted = 0 AND phone IS NOT NULL AND phone <> ''"
                            + " GROUP BY phone HAVING COUNT(*) > 1");
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
        // V116：角色标签名（作者/主理人等），一次批量查完不做 N+1
        Map<Long, String> roleTagNames = loadRoleTagNames(userIds);
        // V119：有效平台付费档 + 到期时间（一次批量查完）
        Map<Long, MemberSubscription> activePlatformSubs = loadActivePlatformSubs(userIds);
        Map<Long, String> planNames = loadPlanNames(
                activePlatformSubs.values().stream()
                        .map(MemberSubscription::getPlanId)
                        .filter(Objects::nonNull)
                        .distinct()
                        .toList());
        // V119：同手机号账号数（用于列表上标「重复」）
        Map<String, Integer> phoneCounts = countPhones(users);

        List<MiniProgramUserVO> result = new ArrayList<>(users.size());
        for (MiniProgramUser user : users) {
            MiniProgramUserVO vo = toBaseVO(user);
            Long uid = user.getId();
            vo.setLevelName(levelNames.get(user.getLevelId()));
            vo.setOrderCount(orderCounts.getOrDefault(uid, 0));
            vo.setFormCount(formCounts.getOrDefault(uid, 0));
            vo.setActCount(actCounts.getOrDefault(uid, 0));
            vo.setTotalSpent(spentMap.getOrDefault(uid, BigDecimal.ZERO));
            vo.setRoleTags(roleTagNames.get(uid));
            // V119：付费档位 + 重复账号计数
            MemberSubscription sub = activePlatformSubs.get(uid);
            if (sub != null) {
                vo.setPlanName(planNames.get(sub.getPlanId()));
                vo.setMemberExpireAt(sub.getExpireAt());
            } else {
                // 无有效订购时保留用户表上的镜像到期时间，便于运营判断「曾是会员但已过期」
                vo.setMemberExpireAt(user.getMemberExpireAt());
            }
            vo.setDuplicateCount(user.getPhone() == null ? 1 : phoneCounts.getOrDefault(user.getPhone(), 1));
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

    /**
     * V116 账号来源展示名。
     * real=真实注册用户 / system=后台配置账号 / test=联调测试账号 / 空=未知（历史数据）。
     */
    private static String accountTypeLabel(String type) {
        if (!StringUtils.hasText(type)) {
            return "未知";
        }
        return switch (type.trim()) {
            case "real" -> "真实注册";
            case "system" -> "后台配置";
            case "test" -> "联调测试";
            default -> type;
        };
    }

    /** V116：批量取用户的角色标签名（只取 is_role=1），返回 { userId: '主理人,编辑' } */
    private Map<Long, String> loadRoleTagNames(List<Long> userIds) {
        if (CollectionUtils.isEmpty(userIds)) {
            return Collections.emptyMap();
        }
        QueryWrapper<UserMemberTag> qw = new QueryWrapper<>();
        qw.select("user_id AS uid", "tag_id AS tagId")
                .in("user_id", userIds)
                .in("tag_id", roleTagIds());
        Map<Long, List<Long>> userToTags = new LinkedHashMap<>();
        for (Map<String, Object> row : userMemberTagMapper.selectMaps(qw)) {
            Object uid = row.get("uid");
            Object tid = row.get("tagId");
            if (uid instanceof Number && tid instanceof Number) {
                userToTags.computeIfAbsent(((Number) uid).longValue(), k -> new ArrayList<>())
                        .add(((Number) tid).longValue());
            }
        }
        if (userToTags.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Long> allTagIds = userToTags.values().stream().flatMap(List::stream).distinct().toList();
        Map<Long, String> tagNames = memberTagMapper.selectList(new LambdaQueryWrapper<MemberTag>()
                        .in(MemberTag::getId, allTagIds))
                .stream()
                .filter(t -> t.getId() != null && t.getName() != null)
                .collect(Collectors.toMap(MemberTag::getId, MemberTag::getName, (a, b) -> a));
        Map<Long, String> result = new LinkedHashMap<>();
        userToTags.forEach((uid, tagIds) -> {
            String joined = tagIds.stream()
                    .map(tagNames::get)
                    .filter(Objects::nonNull)
                    .distinct()
                    .collect(Collectors.joining(","));
            if (!joined.isEmpty()) {
                result.put(uid, joined);
            }
        });
        return result;
    }

    /**
     * V119：批量取有效平台订购（scope=platform、status=active、未过期）。
     * <p>同一用户可能有多条 active 记录（历史遗留），取到期时间最晚的那条，
     * 与 {@code MembershipAccessService#hasPlatformMembership} 的判定保持一致。
     */
    private Map<Long, MemberSubscription> loadActivePlatformSubs(List<Long> userIds) {
        if (CollectionUtils.isEmpty(userIds)) {
            return Collections.emptyMap();
        }
        List<MemberSubscription> subs = memberSubscriptionMapper.selectList(
                new LambdaQueryWrapper<MemberSubscription>()
                        .in(MemberSubscription::getUserId, userIds)
                        .eq(MemberSubscription::getScope, "platform")
                        .eq(MemberSubscription::getStatus, "active")
                        .and(w -> w.isNull(MemberSubscription::getExpireAt)
                                .or().gt(MemberSubscription::getExpireAt, LocalDateTime.now())));
        Map<Long, MemberSubscription> result = new HashMap<>();
        for (MemberSubscription sub : subs) {
            if (sub.getUserId() == null) {
                continue;
            }
            MemberSubscription exists = result.get(sub.getUserId());
            if (exists == null || laterExpire(sub, exists)) {
                result.put(sub.getUserId(), sub);
            }
        }
        return result;
    }

    /** 到期更晚的一条胜出；两者都终身（null）时先到的保留 */
    private static boolean laterExpire(MemberSubscription a, MemberSubscription b) {
        LocalDateTime ea = a.getExpireAt();
        LocalDateTime eb = b.getExpireAt();
        if (ea == null) {
            return false;
        }
        return eb == null || ea.isAfter(eb);
    }

    /** V119：付费档 id → 档名 */
    private Map<Long, String> loadPlanNames(List<Long> planIds) {
        if (CollectionUtils.isEmpty(planIds)) {
            return Collections.emptyMap();
        }
        return membershipPlanMapper.selectList(new LambdaQueryWrapper<MembershipPlan>()
                        .in(MembershipPlan::getId, planIds))
                .stream()
                .filter(p -> p.getId() != null && p.getName() != null)
                .collect(Collectors.toMap(MembershipPlan::getId, MembershipPlan::getName, (a, b) -> a));
    }

    /**
     * V119：当前页用户涉及的每个手机号在 mp_user 内的账号数。
     * <p>只查当前页出现的手机号（IN 列表），不做全表 GROUP BY。
     * 口径与 {@code MemberOpsService#listDuplicateGroups} 一致：排除空手机号与已删账号。
     */
    private Map<String, Integer> countPhones(List<MiniProgramUser> users) {
        List<String> phones = users.stream()
                .map(MiniProgramUser::getPhone)
                .filter(StringUtils::hasText)
                .distinct()
                .toList();
        if (phones.isEmpty()) {
            return Collections.emptyMap();
        }
        QueryWrapper<MiniProgramUser> qw = new QueryWrapper<>();
        qw.select("phone AS phone", "COUNT(*) AS cnt")
                .in("phone", phones)
                .groupBy("phone");
        Map<String, Integer> result = new HashMap<>();
        for (Map<String, Object> row : this.listMaps(qw)) {
            Object phone = row.get("phone");
            Object cnt = row.get("cnt");
            if (phone != null && cnt instanceof Number) {
                result.put(String.valueOf(phone), ((Number) cnt).intValue());
            }
        }
        return result;
    }

    /** V116：角色标签 id 列表（is_role=1） */
    private List<Long> roleTagIds() {        return memberTagMapper.selectList(new LambdaQueryWrapper<MemberTag>()
                        .eq(MemberTag::getIsRole, 1))
                .stream()
                .map(MemberTag::getId)
                .filter(Objects::nonNull)
                .toList();
    }

    private MiniProgramUserVO toBaseVO(MiniProgramUser user) {
        MiniProgramUserVO vo = new MiniProgramUserVO();
        BeanUtils.copyProperties(user, vo);
        // V116：账号来源展示名（real 真实注册 / system 后台配置 / test 联调测试）
        vo.setAccountTypeLabel(accountTypeLabel(user.getAccountType()));
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
