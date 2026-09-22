package com.miniprogram.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.entity.*;
import com.miniprogram.mapper.*;
import com.miniprogram.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberOpsService {

    private final UserMapper userMapper;
    private final MiniProgramUserMapper miniProgramUserMapper;
    private final MemberSubscriptionMapper memberSubscriptionMapper;
    private final MembershipPlanMapper membershipPlanMapper;
    private final MemberTagMapper memberTagMapper;
    private final UserMemberTagMapper userMemberTagMapper;
    private final UserSegmentMapper userSegmentMapper;
    private final MembershipGiftLogMapper membershipGiftLogMapper;
    private final AccountMergeLogMapper accountMergeLogMapper;
    private final SupportTicketMapper supportTicketMapper;
    private final SupportMessageMapper supportMessageMapper;
    private final UserFeedbackMapper userFeedbackMapper;
    private final CommunityPostMapper communityPostMapper;
    private final CommunityCheckinMapper communityCheckinMapper;
    private final ReaderGroupMapper readerGroupMapper;
    private final MembershipAccessService membershipAccessService;
    private final UserNoticeService userNoticeService;
    private final ObjectMapper objectMapper;

    public Map<String, Object> overview() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime in7 = now.plusDays(7);
        LocalDateTime monthStart = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);

        long totalUsers = countUsers(null);
        long paidActive = countActivePlatformSubs(now);
        long expiring7d = countExpiring(now, in7);
        long newMonth = miniProgramUserMapper.selectCount(new LambdaQueryWrapper<MiniProgramUser>()
                .ge(MiniProgramUser::getCreateTime, monthStart));

        List<Map<String, Object>> tiles = List.of(
                tile("真实用户", totalUsers, "去重用户"),
                tile("付费会员", paidActive, pct(paidActive, totalUsers) + "% 占比"),
                tile("7天内到期", expiring7d, "需提醒续费"),
                tile("本月新增", newMonth, "注册用户")
        );

        long dupGroups = listDuplicateGroups().size();
        long expired = countExpired(now);
        long openTickets = supportTicketMapper.selectCount(new LambdaQueryWrapper<SupportTicket>()
                .eq(SupportTicket::getStatus, "open"));

        List<Map<String, Object>> todos = new ArrayList<>();
        todos.add(todo("expire", "到期提醒", expiring7d, "可一键发续费提醒", "/member/users?seg=expire_7d"));
        todos.add(todo("dup", "重复账号待合并", dupGroups, "同手机号多账号", "/member/users?tab=list&dup=1"));
        todos.add(todo("expired", "已过期未续费", expired, "召回", "/member/users?seg=expired"));
        todos.add(todo("support", "客服待回复", openTickets, "会话收件箱", "/member/support"));

        long profiled = miniProgramUserMapper.selectCount(new LambdaQueryWrapper<MiniProgramUser>()
                .isNotNull(MiniProgramUser::getPhone)
                .ne(MiniProgramUser::getPhone, ""));
        long active7 = miniProgramUserMapper.selectCount(new LambdaQueryWrapper<MiniProgramUser>()
                .ge(MiniProgramUser::getLastVisitAt, now.minusDays(7)));

        List<Map<String, Object>> funnel = List.of(
                Map.of("label", "注册", "value", totalUsers),
                Map.of("label", "完善资料", "value", profiled),
                Map.of("label", "近7天活跃", "value", active7),
                Map.of("label", "付费", "value", paidActive)
        );

        List<Map<String, Object>> planMix = new ArrayList<>();
        List<MembershipPlan> plans = membershipPlanMapper.selectList(new LambdaQueryWrapper<MembershipPlan>()
                .eq(MembershipPlan::getScope, "platform")
                .orderByAsc(MembershipPlan::getSortOrder));
        for (MembershipPlan p : plans) {
            long c = memberSubscriptionMapper.selectCount(new LambdaQueryWrapper<MemberSubscription>()
                    .eq(MemberSubscription::getPlanId, p.getId())
                    .eq(MemberSubscription::getStatus, "active")
                    .and(w -> w.isNull(MemberSubscription::getExpireAt)
                            .or().gt(MemberSubscription::getExpireAt, now)));
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("planId", p.getId());
            row.put("name", p.getName());
            row.put("count", c);
            row.put("price", null);
            row.put("period", p.getScope());
            row.put("on", p.getStatus() != null && p.getStatus() == 1);
            planMix.add(row);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("tiles", tiles);
        out.put("todos", todos);
        out.put("funnel", funnel);
        out.put("planMix", planMix);
        return out;
    }

    public List<Map<String, Object>> listSegments() {
        List<UserSegment> segs = userSegmentMapper.selectList(new LambdaQueryWrapper<UserSegment>()
                .eq(UserSegment::getStatus, 1)
                .orderByAsc(UserSegment::getSortOrder)
                .orderByAsc(UserSegment::getId));
        List<Map<String, Object>> out = new ArrayList<>();
        for (UserSegment s : segs) {
            List<User> members = resolveSegmentUsers(s.getRuleCode());
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("name", s.getName());
            m.put("ruleDesc", s.getRuleDesc());
            m.put("ruleCode", s.getRuleCode());
            m.put("reachAction", s.getReachAction());
            m.put("sortOrder", s.getSortOrder());
            m.put("status", s.getStatus());
            m.put("memberCount", members.size());
            m.put("avatars", members.stream().limit(5).map(u -> {
                Map<String, Object> a = new LinkedHashMap<>();
                a.put("name", u.getNickname());
                a.put("tone", tone(u.getId()));
                return a;
            }).collect(Collectors.toList()));
            out.add(m);
        }
        return out;
    }

    public UserSegment createSegment(Map<String, Object> body) {
        UserSegment s = new UserSegment();
        s.setName(str(body, "name"));
        if (!StringUtils.hasText(s.getName())) throw new BusinessException(ErrorCode.PARAM_ERROR, "分群名必填");
        s.setRuleDesc(str(body, "ruleDesc"));
        s.setRuleCode(Optional.ofNullable(str(body, "ruleCode")).orElse("custom"));
        s.setReachAction(str(body, "reachAction"));
        s.setSortOrder(intOr(body, "sortOrder", 99));
        s.setStatus(1);
        s.setCreateTime(LocalDateTime.now());
        s.setUpdateTime(LocalDateTime.now());
        userSegmentMapper.insert(s);
        return s;
    }

    public UserSegment updateSegment(Long id, Map<String, Object> body) {
        UserSegment s = userSegmentMapper.selectById(id);
        if (s == null) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "分群不存在");
        if (body.containsKey("name")) s.setName(str(body, "name"));
        if (body.containsKey("ruleDesc")) s.setRuleDesc(str(body, "ruleDesc"));
        if (body.containsKey("ruleCode")) s.setRuleCode(str(body, "ruleCode"));
        if (body.containsKey("reachAction")) s.setReachAction(str(body, "reachAction"));
        if (body.containsKey("status")) s.setStatus(intOr(body, "status", 1));
        s.setUpdateTime(LocalDateTime.now());
        userSegmentMapper.updateById(s);
        return s;
    }

    public void deleteSegment(Long id) {
        userSegmentMapper.deleteById(id);
    }

    public Map<String, Object> segmentMembers(Long id) {
        UserSegment s = userSegmentMapper.selectById(id);
        if (s == null) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "分群不存在");
        List<User> users = resolveSegmentUsers(s.getRuleCode());
        List<Map<String, Object>> records = users.stream().limit(200).map(u -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", u.getId());
            m.put("nickname", u.getNickname());
            m.put("phone", u.getPhone());
            m.put("lastVisitAt", u.getLastVisitAt());
            m.put("memberExpireAt", u.getMemberExpireAt());
            return m;
        }).collect(Collectors.toList());
        return Map.of("total", users.size(), "records", records);
    }

    @Transactional
    public Map<String, Object> reachSegment(Long id, Map<String, Object> body) {
        UserSegment s = userSegmentMapper.selectById(id);
        if (s == null) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "分群不存在");
        String action = Optional.ofNullable(str(body, "action")).orElse(s.getReachAction());
        List<User> users = resolveSegmentUsers(s.getRuleCode());
        int n = 0;
        if ("gift".equals(action)) {
            Long planId = longOr(body, "planId", null);
            Integer days = intOr(body, "days", 7);
            String reason = Optional.ofNullable(str(body, "reason")).orElse("分群触达赠送");
            if (planId == null) throw new BusinessException(ErrorCode.PARAM_ERROR, "赠送需 planId");
            for (User u : users) {
                giftOne(u.getId(), planId, days, reason);
                n++;
            }
        } else {
            String title = Optional.ofNullable(str(body, "title")).orElse(defaultReachTitle(action));
            String content = Optional.ofNullable(str(body, "content")).orElse(defaultReachContent(action, s.getName()));
            for (User u : users) {
                userNoticeService.notifyUser(u.getId(), "segment_reach", title, content);
                n++;
            }
        }
        return Map.of("reached", n, "action", action == null ? "remind" : action);
    }

    @Transactional
    public Map<String, Object> gift(Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Number> ids = (List<Number>) body.get("userIds");
        if (ids == null || ids.isEmpty()) throw new BusinessException(ErrorCode.PARAM_ERROR, "userIds 必填");
        Long planId = longOr(body, "planId", null);
        Integer days = intOr(body, "days", 30);
        String reason = str(body, "reason");
        if (planId == null) throw new BusinessException(ErrorCode.PARAM_ERROR, "planId 必填");
        if (!StringUtils.hasText(reason)) throw new BusinessException(ErrorCode.PARAM_ERROR, "请填写赠送原因");
        int ok = 0;
        for (Number id : ids) {
            giftOne(id.longValue(), planId, days, reason);
            ok++;
        }
        return Map.of("gifted", ok);
    }

    private void giftOne(Long userId, Long planId, Integer days, String reason) {
        membershipAccessService.adminGiftSubscription(userId, planId, days);
        User u = userMapper.selectById(userId);
        MembershipGiftLog logRow = new MembershipGiftLog();
        logRow.setUserId(userId);
        logRow.setPlanId(planId);
        logRow.setDays(days);
        logRow.setReason(reason);
        logRow.setAdminId(SecurityUtils.getCurrentUserId());
        logRow.setExpireAt(u == null ? null : u.getMemberExpireAt());
        logRow.setCreateTime(LocalDateTime.now());
        membershipGiftLogMapper.insert(logRow);
        userNoticeService.notifyUser(userId, "membership_gift", "会员已开通",
                "运营赠送会员：" + reason + (days != null && days > 0 ? "（" + days + "天）" : "（终身）"));
    }

    public List<Map<String, Object>> listDuplicates() {
        return listDuplicateGroups();
    }

    @Transactional
    public Map<String, Object> merge(Map<String, Object> body) {
        Long keepId = longOr(body, "keepUserId", null);
        @SuppressWarnings("unchecked")
        List<Number> mergeIds = (List<Number>) body.get("mergeUserIds");
        if (keepId == null || mergeIds == null || mergeIds.isEmpty()) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "keepUserId / mergeUserIds 必填");
        }
        User keep = userMapper.selectById(keepId);
        if (keep == null) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "主账号不存在");
        int merged = 0;
        for (Number mid : mergeIds) {
            Long mergeId = mid.longValue();
            if (Objects.equals(mergeId, keepId)) continue;
            User other = userMapper.selectById(mergeId);
            if (other == null) continue;
            int pts = (keep.getPoints() == null ? 0 : keep.getPoints()) + (other.getPoints() == null ? 0 : other.getPoints());
            keep.setPoints(pts);
            if (!StringUtils.hasText(keep.getPhone()) && StringUtils.hasText(other.getPhone())) {
                keep.setPhone(other.getPhone());
            }
            if (keep.getLastVisitAt() == null || (other.getLastVisitAt() != null && other.getLastVisitAt().isAfter(keep.getLastVisitAt()))) {
                keep.setLastVisitAt(other.getLastVisitAt());
            }
            if (keep.getMemberExpireAt() == null || (other.getMemberExpireAt() != null
                    && (keep.getMemberExpireAt() != null && other.getMemberExpireAt().isAfter(keep.getMemberExpireAt())))) {
                if (other.getMemberExpireAt() != null) keep.setMemberExpireAt(other.getMemberExpireAt());
            }
            // 迁移标签
            List<UserMemberTag> tags = userMemberTagMapper.selectList(new LambdaQueryWrapper<UserMemberTag>()
                    .eq(UserMemberTag::getUserId, mergeId));
            for (UserMemberTag t : tags) {
                Long tagId = t.getTagId();
                Long exists = userMemberTagMapper.selectCount(new LambdaQueryWrapper<UserMemberTag>()
                        .eq(UserMemberTag::getUserId, keepId).eq(UserMemberTag::getTagId, tagId));
                if (exists == null || exists == 0) {
                    UserMemberTag neu = new UserMemberTag();
                    neu.setUserId(keepId);
                    neu.setTagId(tagId);
                    neu.setCreateTime(LocalDateTime.now());
                    userMemberTagMapper.insert(neu);
                }
            }
            userMemberTagMapper.delete(new LambdaQueryWrapper<UserMemberTag>().eq(UserMemberTag::getUserId, mergeId));
            // 迁移订购：把 merge 的 active 订购转到 keep（简化：延长 keep 平台到期）
            List<MemberSubscription> subs = memberSubscriptionMapper.selectList(new LambdaQueryWrapper<MemberSubscription>()
                    .eq(MemberSubscription::getUserId, mergeId)
                    .eq(MemberSubscription::getStatus, "active"));
            for (MemberSubscription sub : subs) {
                sub.setStatus("cancelled");
                memberSubscriptionMapper.updateById(sub);
                if ("platform".equals(sub.getScope()) && sub.getPlanId() != null) {
                    Integer days = 0;
                    if (sub.getExpireAt() != null) {
                        long d = java.time.Duration.between(LocalDateTime.now(), sub.getExpireAt()).toDays();
                        days = (int) Math.max(d, 1);
                    }
                    membershipAccessService.adminGiftSubscription(keepId, sub.getPlanId(), days);
                }
            }
            AccountMergeLog mlog = new AccountMergeLog();
            mlog.setKeepUserId(keepId);
            mlog.setMergedUserId(mergeId);
            mlog.setPhone(other.getPhone());
            mlog.setAdminId(SecurityUtils.getCurrentUserId());
            mlog.setCreateTime(LocalDateTime.now());
            try {
                mlog.setDetailJson(objectMapper.writeValueAsString(Map.of(
                        "mergedNickname", other.getNickname(),
                        "mergedPoints", other.getPoints()
                )));
            } catch (Exception ignored) {
            }
            accountMergeLogMapper.insert(mlog);
            // 软删从账号
            miniProgramUserMapper.deleteById(mergeId);
            merged++;
        }
        userMapper.updateById(keep);
        return Map.of("merged", merged, "keepUserId", keepId);
    }

    public List<MemberTag> getUserTags(Long userId) {
        List<UserMemberTag> links = userMemberTagMapper.selectList(new LambdaQueryWrapper<UserMemberTag>()
                .eq(UserMemberTag::getUserId, userId));
        if (links.isEmpty()) return List.of();
        Set<Long> ids = links.stream().map(UserMemberTag::getTagId).collect(Collectors.toSet());
        return memberTagMapper.selectBatchIds(ids);
    }

    @Transactional
    public void putUserTags(Long userId, List<Number> tagIds) {
        userMemberTagMapper.delete(new LambdaQueryWrapper<UserMemberTag>().eq(UserMemberTag::getUserId, userId));
        if (tagIds == null) return;
        Set<Long> uniq = tagIds.stream().filter(Objects::nonNull).map(Number::longValue).collect(Collectors.toSet());
        for (Long tagId : uniq) {
            UserMemberTag row = new UserMemberTag();
            row.setUserId(userId);
            row.setTagId(tagId);
            row.setCreateTime(LocalDateTime.now());
            userMemberTagMapper.insert(row);
            memberTagMapper.update(null, new LambdaUpdateWrapper<MemberTag>()
                    .eq(MemberTag::getId, tagId)
                    .setSql("use_count = IFNULL(use_count,0) + 1"));
        }
    }

    public void putUserNote(Long userId, String note) {
        User u = userMapper.selectById(userId);
        if (u == null) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "用户不存在");
        u.setAdminNote(note);
        userMapper.updateById(u);
    }

    public List<Map<String, Object>> listTickets(String status) {
        LambdaQueryWrapper<SupportTicket> w = new LambdaQueryWrapper<SupportTicket>()
                .orderByDesc(SupportTicket::getUpdateTime);
        if (StringUtils.hasText(status)) w.eq(SupportTicket::getStatus, status);
        List<SupportTicket> list = supportTicketMapper.selectList(w);
        List<Map<String, Object>> out = new ArrayList<>();
        for (SupportTicket t : list) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", t.getId());
            m.put("userId", t.getUserId());
            m.put("whoName", t.getWhoName());
            m.put("lastText", t.getLastText());
            m.put("status", t.getStatus());
            m.put("lastReply", t.getLastReply());
            m.put("createTime", t.getCreateTime());
            m.put("updateTime", t.getUpdateTime());
            if (t.getUserId() != null) {
                User u = userMapper.selectById(t.getUserId());
                if (u != null) {
                    m.put("phone", u.getPhone());
                    MembershipPlan plan = membershipAccessService.findActivePlatformPlan(u.getId());
                    if (plan != null) m.put("planName", plan.getName());
                }
            }
            out.add(m);
        }
        return out;
    }

    @Transactional
    public void replyTicket(Long id, String content) {
        if (!StringUtils.hasText(content)) throw new BusinessException(ErrorCode.PARAM_ERROR, "回复内容必填");
        SupportTicket t = supportTicketMapper.selectById(id);
        if (t == null) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "会话不存在");
        SupportMessage msg = new SupportMessage();
        msg.setTicketId(id);
        msg.setSender("admin");
        msg.setContent(content.trim());
        msg.setAdminId(SecurityUtils.getCurrentUserId());
        msg.setCreateTime(LocalDateTime.now());
        supportMessageMapper.insert(msg);
        t.setLastReply(content.trim());
        t.setStatus("done");
        t.setUpdateTime(LocalDateTime.now());
        supportTicketMapper.updateById(t);
        if (t.getUserId() != null) {
            userNoticeService.notifyUser(t.getUserId(), "support_reply", "客服回复", content.trim());
        }
    }

    public void updateTicketStatus(Long id, String status) {
        SupportTicket t = supportTicketMapper.selectById(id);
        if (t == null) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "会话不存在");
        t.setStatus(status);
        t.setUpdateTime(LocalDateTime.now());
        supportTicketMapper.updateById(t);
    }

    public List<Map<String, Object>> listFeedback() {
        List<UserFeedback> list = userFeedbackMapper.selectList(new LambdaQueryWrapper<UserFeedback>()
                .orderByDesc(UserFeedback::getCreatedAt)
                .last("LIMIT 200"));
        List<Map<String, Object>> out = new ArrayList<>();
        for (UserFeedback f : list) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", f.getId());
            m.put("userId", f.getUserId());
            m.put("content", f.getContent());
            m.put("adminReply", f.getAdminReply());
            m.put("createTime", f.getCreatedAt());
            m.put("handledAt", f.getHandledAt());
            if (f.getUserId() != null) {
                User u = userMapper.selectById(f.getUserId());
                if (u != null) m.put("nickname", u.getNickname());
            }
            out.add(m);
        }
        return out;
    }

    public void replyFeedback(Long id, String content) {
        UserFeedback f = userFeedbackMapper.selectById(id);
        if (f == null) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "反馈不存在");
        f.setAdminReply(content);
        f.setHandledAt(LocalDateTime.now());
        f.setHandledBy(SecurityUtils.getCurrentUserId());
        f.setStatus("handled");
        userFeedbackMapper.updateById(f);
        if (f.getUserId() != null) {
            userNoticeService.notifyUser(f.getUserId(), "feedback_reply", "反馈已回复", content);
            // 同步进客服会话
            SupportTicket t = new SupportTicket();
            t.setUserId(f.getUserId());
            User u = userMapper.selectById(f.getUserId());
            t.setWhoName(u == null ? "用户" : u.getNickname());
            t.setLastText(f.getContent());
            t.setLastReply(content);
            t.setStatus("done");
            t.setCreateTime(LocalDateTime.now());
            t.setUpdateTime(LocalDateTime.now());
            supportTicketMapper.insert(t);
        }
    }

    public List<CommunityPost> listPosts(String communityId) {
        LambdaQueryWrapper<CommunityPost> w = new LambdaQueryWrapper<CommunityPost>()
                .orderByDesc(CommunityPost::getPinned)
                .orderByDesc(CommunityPost::getId);
        if (StringUtils.hasText(communityId)) w.eq(CommunityPost::getCommunityId, communityId);
        return communityPostMapper.selectList(w);
    }

    public CommunityPost createPost(Map<String, Object> body) {
        CommunityPost p = new CommunityPost();
        p.setCommunityId(Optional.ofNullable(str(body, "communityId")).orElse("main"));
        p.setAuthorName(Optional.ofNullable(str(body, "authorName")).orElse("运营"));
        p.setUserId(longOr(body, "userId", null));
        p.setKind(Optional.ofNullable(str(body, "kind")).orElse("feed"));
        p.setTextContent(str(body, "textContent"));
        if (!StringUtils.hasText(p.getTextContent())) throw new BusinessException(ErrorCode.PARAM_ERROR, "内容必填");
        p.setTopic(str(body, "topic"));
        p.setPinned(0);
        p.setEssence(0);
        p.setHidden(0);
        p.setLikes(0);
        p.setComments(0);
        p.setCreateTime(LocalDateTime.now());
        p.setUpdateTime(LocalDateTime.now());
        communityPostMapper.insert(p);
        return p;
    }

    public CommunityPost updatePost(Long id, Map<String, Object> body) {
        CommunityPost p = communityPostMapper.selectById(id);
        if (p == null) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "动态不存在");
        if (body.containsKey("pinned")) p.setPinned(boolInt(body.get("pinned")));
        if (body.containsKey("essence")) p.setEssence(boolInt(body.get("essence")));
        if (body.containsKey("hidden")) p.setHidden(boolInt(body.get("hidden")));
        if (body.containsKey("replyText")) p.setReplyText(str(body, "replyText"));
        if (body.containsKey("textContent")) p.setTextContent(str(body, "textContent"));
        p.setUpdateTime(LocalDateTime.now());
        communityPostMapper.updateById(p);
        return p;
    }

    public List<CommunityCheckin> listCheckins(String communityId) {
        LambdaQueryWrapper<CommunityCheckin> w = new LambdaQueryWrapper<CommunityCheckin>()
                .orderByDesc(CommunityCheckin::getId);
        if (StringUtils.hasText(communityId)) w.eq(CommunityCheckin::getCommunityId, communityId);
        return communityCheckinMapper.selectList(w);
    }

    public CommunityCheckin createCheckin(Map<String, Object> body) {
        CommunityCheckin c = new CommunityCheckin();
        c.setCommunityId(Optional.ofNullable(str(body, "communityId")).orElse("main"));
        c.setName(str(body, "name"));
        if (!StringUtils.hasText(c.getName())) throw new BusinessException(ErrorCode.PARAM_ERROR, "名称必填");
        c.setDays(intOr(body, "days", 7));
        c.setJoinedCount(0);
        c.setTodayCount(0);
        c.setStatus(1);
        c.setCreateTime(LocalDateTime.now());
        c.setUpdateTime(LocalDateTime.now());
        communityCheckinMapper.insert(c);
        return c;
    }

    public CommunityCheckin updateCheckin(Long id, Map<String, Object> body) {
        CommunityCheckin c = communityCheckinMapper.selectById(id);
        if (c == null) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "打卡不存在");
        if (body.containsKey("name")) c.setName(str(body, "name"));
        if (body.containsKey("days")) c.setDays(intOr(body, "days", c.getDays()));
        if (body.containsKey("status")) c.setStatus(intOr(body, "status", 1));
        c.setUpdateTime(LocalDateTime.now());
        communityCheckinMapper.updateById(c);
        return c;
    }

    public void deleteCheckin(Long id) {
        communityCheckinMapper.deleteById(id);
    }

    public List<ReaderGroup> listReaderGroups() {
        return readerGroupMapper.selectList(new LambdaQueryWrapper<ReaderGroup>()
                .orderByAsc(ReaderGroup::getSortOrder)
                .orderByDesc(ReaderGroup::getId));
    }

    public ReaderGroup createReaderGroup(Map<String, Object> body) {
        ReaderGroup g = new ReaderGroup();
        g.setName(str(body, "name"));
        if (!StringUtils.hasText(g.getName())) throw new BusinessException(ErrorCode.PARAM_ERROR, "名称必填");
        g.setDirector(str(body, "director"));
        g.setWhoCanJoin(Optional.ofNullable(str(body, "whoCanJoin")).orElse("all"));
        g.setQrUrl(str(body, "qrUrl"));
        g.setFullFlag(0);
        g.setStatus(1);
        g.setSortOrder(intOr(body, "sortOrder", 0));
        g.setCreateTime(LocalDateTime.now());
        g.setUpdateTime(LocalDateTime.now());
        if (StringUtils.hasText(g.getQrUrl())) {
            g.setQrExpireAt(LocalDateTime.now().plusDays(7));
        }
        readerGroupMapper.insert(g);
        return g;
    }

    public ReaderGroup updateReaderGroup(Long id, Map<String, Object> body) {
        ReaderGroup g = readerGroupMapper.selectById(id);
        if (g == null) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "读者群不存在");
        if (body.containsKey("name")) g.setName(str(body, "name"));
        if (body.containsKey("director")) g.setDirector(str(body, "director"));
        if (body.containsKey("whoCanJoin")) g.setWhoCanJoin(str(body, "whoCanJoin"));
        if (body.containsKey("qrUrl")) {
            g.setQrUrl(str(body, "qrUrl"));
            if (StringUtils.hasText(g.getQrUrl())) g.setQrExpireAt(LocalDateTime.now().plusDays(7));
        }
        if (body.containsKey("fullFlag")) g.setFullFlag(boolInt(body.get("fullFlag")));
        if (body.containsKey("status")) g.setStatus(intOr(body, "status", 1));
        g.setUpdateTime(LocalDateTime.now());
        readerGroupMapper.updateById(g);
        return g;
    }

    public void deleteReaderGroup(Long id) {
        readerGroupMapper.deleteById(id);
    }

    // ---- helpers ----

    private List<User> resolveSegmentUsers(String code) {
        LocalDateTime now = LocalDateTime.now();
        if ("expire_7d".equals(code)) {
            return userMapper.selectList(new LambdaQueryWrapper<User>()
                    .isNotNull(User::getMemberExpireAt)
                    .gt(User::getMemberExpireAt, now)
                    .le(User::getMemberExpireAt, now.plusDays(7)));
        }
        if ("expired".equals(code)) {
            return userMapper.selectList(new LambdaQueryWrapper<User>()
                    .isNotNull(User::getMemberExpireAt)
                    .lt(User::getMemberExpireAt, now));
        }
        if ("sleep_30d".equals(code)) {
            return userMapper.selectList(new LambdaQueryWrapper<User>()
                    .and(w -> w.isNull(User::getMemberExpireAt).or().gt(User::getMemberExpireAt, now))
                    .and(w -> w.isNull(User::getLastVisitAt).or().lt(User::getLastVisitAt, now.minusDays(30)))
                    .last("LIMIT 500"));
        }
        if ("default_nickname".equals(code)) {
            return userMapper.selectList(new LambdaQueryWrapper<User>()
                    .and(w -> w.isNull(User::getNickname).or().eq(User::getNickname, "微信用户").or().eq(User::getNickname, ""))
                    .last("LIMIT 500"));
        }
        if ("high_active_non_member".equals(code)) {
            List<User> active = userMapper.selectList(new LambdaQueryWrapper<User>()
                    .ge(User::getLastVisitAt, now.minusDays(7))
                    .last("LIMIT 500"));
            return active.stream().filter(u -> !membershipAccessService.hasPlatformMembership(u.getId()))
                    .collect(Collectors.toList());
        }
        return List.of();
    }

    private List<Map<String, Object>> listDuplicateGroups() {
        List<User> withPhone = userMapper.selectList(new LambdaQueryWrapper<User>()
                .isNotNull(User::getPhone)
                .ne(User::getPhone, "")
                .last("LIMIT 5000"));
        Map<String, List<User>> byPhone = withPhone.stream()
                .collect(Collectors.groupingBy(User::getPhone));
        List<Map<String, Object>> groups = new ArrayList<>();
        for (Map.Entry<String, List<User>> e : byPhone.entrySet()) {
            if (e.getValue().size() < 2) continue;
            List<User> sorted = e.getValue().stream()
                    .sorted(Comparator.comparing(User::getId))
                    .collect(Collectors.toList());
            Map<String, Object> g = new LinkedHashMap<>();
            g.put("phone", e.getKey());
            g.put("keepUserId", sorted.get(0).getId());
            g.put("users", sorted.stream().map(u -> Map.of(
                    "id", u.getId(),
                    "nickname", Optional.ofNullable(u.getNickname()).orElse(""),
                    "points", Optional.ofNullable(u.getPoints()).orElse(0)
            )).collect(Collectors.toList()));
            groups.add(g);
        }
        return groups;
    }

    private long countUsers(Void ignored) {
        return miniProgramUserMapper.selectCount(new LambdaQueryWrapper<>());
    }

    private long countActivePlatformSubs(LocalDateTime now) {
        return memberSubscriptionMapper.selectCount(new LambdaQueryWrapper<MemberSubscription>()
                .eq(MemberSubscription::getScope, "platform")
                .eq(MemberSubscription::getStatus, "active")
                .and(w -> w.isNull(MemberSubscription::getExpireAt).or().gt(MemberSubscription::getExpireAt, now)));
    }

    private long countExpiring(LocalDateTime now, LocalDateTime end) {
        return userMapper.selectCount(new LambdaQueryWrapper<User>()
                .isNotNull(User::getMemberExpireAt)
                .gt(User::getMemberExpireAt, now)
                .le(User::getMemberExpireAt, end));
    }

    private long countExpired(LocalDateTime now) {
        return userMapper.selectCount(new LambdaQueryWrapper<User>()
                .isNotNull(User::getMemberExpireAt)
                .lt(User::getMemberExpireAt, now));
    }

    private static Map<String, Object> tile(String label, long value, String hint) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("label", label);
        m.put("value", value);
        m.put("hint", hint);
        return m;
    }

    private static Map<String, Object> todo(String key, String title, long count, String hint, String path) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("key", key);
        m.put("title", title);
        m.put("count", count);
        m.put("hint", hint);
        m.put("path", path);
        return m;
    }

    private static String pct(long a, long b) {
        if (b <= 0) return "0";
        return String.valueOf(Math.round(a * 1000.0 / b) / 10.0);
    }

    private static String tone(Long id) {
        String[] tones = {"#B4430F", "#2458a6", "#1f7a4d", "#8f5400", "#5e5146"};
        if (id == null) return tones[0];
        return tones[(int) (Math.abs(id) % tones.length)];
    }

    private static String str(Map<String, Object> body, String key) {
        if (body == null || body.get(key) == null) return null;
        String v = String.valueOf(body.get(key)).trim();
        return v.isEmpty() || "null".equals(v) ? null : v;
    }

    private static Integer intOr(Map<String, Object> body, String key, Integer def) {
        if (body == null || body.get(key) == null) return def;
        try {
            return Integer.parseInt(String.valueOf(body.get(key)));
        } catch (Exception e) {
            return def;
        }
    }

    private static Long longOr(Map<String, Object> body, String key, Long def) {
        if (body == null || body.get(key) == null) return def;
        try {
            return Long.parseLong(String.valueOf(body.get(key)));
        } catch (Exception e) {
            return def;
        }
    }

    private static int boolInt(Object v) {
        if (v == null) return 0;
        if (v instanceof Boolean b) return b ? 1 : 0;
        String s = String.valueOf(v);
        return "1".equals(s) || "true".equalsIgnoreCase(s) ? 1 : 0;
    }

    private static String defaultReachTitle(String action) {
        if ("coupon".equals(action)) return "专属召回优惠";
        if ("content".equals(action)) return "为你推荐内容";
        if ("profile".equals(action)) return "完善资料提醒";
        return "续费提醒";
    }

    private static String defaultReachContent(String action, String segName) {
        return "来自运营分群「" + segName + "」的消息（" + (action == null ? "remind" : action) + "）。打开小程序即可查看。";
    }
}
