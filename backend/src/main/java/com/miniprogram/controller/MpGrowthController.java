package com.miniprogram.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.R;
import com.miniprogram.dto.member.SignInVO;
import com.miniprogram.entity.*;
import com.miniprogram.mapper.*;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.MemberPointsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Tag(name = "小程序增长能力")
@RestController
@RequestMapping("/api/v1/mp")
@RequiredArgsConstructor
public class MpGrowthController {

    private final AnalyticsEventMapper analyticsEventMapper;
    private final SearchLogMapper searchLogMapper;
    private final MemberCheckinMapper memberCheckinMapper;
    private final MemberTaskMapper memberTaskMapper;
    private final MemberTaskLogMapper memberTaskLogMapper;
    private final InviteRelationMapper inviteRelationMapper;
    private final PageExperimentMapper pageExperimentMapper;
    private final MemberPointsService memberPointsService;
    private final SubscribeTemplateMapper subscribeTemplateMapper;

    @Operation(summary = "上报行为事件")
    @PostMapping("/events")
    public R<Void> track(@RequestBody EventBody body) {
        if (body == null || !StringUtils.hasText(body.getEventName())) {
            return R.ok();
        }
        AnalyticsEvent e = new AnalyticsEvent();
        try { e.setUserId(SecurityUtils.getCurrentUserId()); } catch (Exception ignored) {}
        e.setEventName(body.getEventName().trim());
        e.setPage(body.getPage());
        e.setComponentId(body.getComponentId());
        e.setItemId(body.getItemId());
        e.setProps(body.getProps());
        e.setSourceChannel(body.getSourceChannel());
        e.setInviterId(body.getInviterId());
        e.setCreateTime(LocalDateTime.now());
        analyticsEventMapper.insert(e);
        return R.ok();
    }

    @Operation(summary = "订阅消息模板（已启用）")
    @GetMapping("/subscribe/templates")
    public R<List<Map<String, Object>>> subscribeTemplates(@RequestParam(required = false) String scene) {
        LambdaQueryWrapper<SubscribeTemplate> q = new LambdaQueryWrapper<SubscribeTemplate>()
                .eq(SubscribeTemplate::getEnabled, 1)
                .orderByAsc(SubscribeTemplate::getId);
        if (StringUtils.hasText(scene)) {
            q.eq(SubscribeTemplate::getScene, scene.trim());
        }
        List<SubscribeTemplate> list = subscribeTemplateMapper.selectList(q);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (SubscribeTemplate t : list) {
            if (!StringUtils.hasText(t.getTemplateId())) continue;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("scene", t.getScene());
            m.put("templateId", t.getTemplateId());
            m.put("title", t.getTitle());
            rows.add(m);
        }
        return R.ok(rows);
    }

    @Operation(summary = "批量上报事件")
    @PostMapping("/events/batch")
    public R<Void> trackBatch(@RequestBody List<EventBody> list) {
        if (list == null || list.isEmpty()) return R.ok();
        if (list.size() > 50) {
            return R.fail(400201, "单次最多上报50条事件");
        }
        for (EventBody body : list) {
            track(body);
        }
        return R.ok();
    }

    @Operation(summary = "记录搜索词")
    @PostMapping("/search/log")
    public R<Void> searchLog(@RequestBody SearchBody body) {
        if (body == null || !StringUtils.hasText(body.getKeyword())) return R.ok();
        SearchLog log = new SearchLog();
        try { log.setUserId(SecurityUtils.getCurrentUserId()); } catch (Exception ignored) {}
        log.setKeyword(body.getKeyword().trim());
        log.setResultCount(body.getResultCount() == null ? 0 : body.getResultCount());
        log.setPage(body.getPage());
        log.setCreateTime(LocalDateTime.now());
        searchLogMapper.insert(log);
        return R.ok();
    }

    @Operation(summary = "热搜 / 无结果词")
    @GetMapping("/search/insights")
    public R<Map<String, Object>> searchInsights() {
        List<SearchLog> recent = searchLogMapper.selectList(new LambdaQueryWrapper<SearchLog>()
                .orderByDesc(SearchLog::getCreateTime).last("LIMIT 500"));
        Map<String, Integer> hot = new LinkedHashMap<>();
        Map<String, Integer> zero = new LinkedHashMap<>();
        for (SearchLog s : recent) {
            hot.merge(s.getKeyword(), 1, Integer::sum);
            if (s.getResultCount() != null && s.getResultCount() == 0) {
                zero.merge(s.getKeyword(), 1, Integer::sum);
            }
        }
        Map<String, Object> data = new HashMap<>();
        data.put("hot", topN(hot, 20));
        data.put("noResult", topN(zero, 20));
        return R.ok(data);
    }

    @Operation(summary = "每日签到（同步会员积分）")
    @PostMapping("/member/checkin")
    public R<Map<String, Object>> checkin() {
        Long userId = SecurityUtils.getCurrentUserId();
        Map<String, Object> data = new HashMap<>();
        try {
            SignInVO vo = memberPointsService.signIn(userId);
            syncCheckinRow(userId, vo.getContinuousSignDays(), vo.getEarnedPoints());
            data.put("already", false);
            data.put("streak", vo.getContinuousSignDays());
            data.put("points", vo.getEarnedPoints());
            data.put("totalPoints", vo.getTotalPoints());
            completeTaskQuiet(userId, "daily_checkin", null);
        } catch (BusinessException ex) {
            MemberCheckin exists = memberCheckinMapper.selectOne(new LambdaQueryWrapper<MemberCheckin>()
                    .eq(MemberCheckin::getUserId, userId)
                    .eq(MemberCheckin::getCheckinDate, LocalDate.now())
                    .last("LIMIT 1"));
            data.put("already", true);
            data.put("streak", exists == null ? 0 : exists.getStreak());
            data.put("points", exists == null ? 0 : exists.getPoints());
            data.put("message", ex.getMessage());
        }
        return R.ok(data);
    }

    @Operation(summary = "任务中心列表")
    @GetMapping("/member/tasks")
    public R<List<Map<String, Object>>> tasks() {
        Long userId = SecurityUtils.getCurrentUserId();
        LocalDateTime dayStart = LocalDate.now().atStartOfDay();
        List<MemberTask> defs = memberTaskMapper.selectList(new LambdaQueryWrapper<MemberTask>()
                .eq(MemberTask::getEnabled, 1));
        List<Map<String, Object>> list = new ArrayList<>();
        for (MemberTask t : defs) {
            long done = memberTaskLogMapper.selectCount(new LambdaQueryWrapper<MemberTaskLog>()
                    .eq(MemberTaskLog::getUserId, userId)
                    .eq(MemberTaskLog::getTaskCode, t.getCode())
                    .ge(MemberTaskLog::getCreateTime, dayStart));
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("code", t.getCode());
            m.put("name", t.getName());
            m.put("points", t.getPoints());
            m.put("dailyLimit", t.getDailyLimit());
            m.put("doneToday", done);
            m.put("remaining", Math.max(0, (t.getDailyLimit() == null ? 1 : t.getDailyLimit()) - done));
            list.add(m);
        }
        return R.ok(list);
    }

    @Operation(summary = "完成任务领积分")
    @PostMapping("/member/tasks/complete")
    public R<Map<String, Object>> completeTask(@RequestBody TaskBody body) {
        Long userId = SecurityUtils.getCurrentUserId();
        String code = body == null ? null : body.getCode();
        if (!StringUtils.hasText(code)) {
            return R.fail(400201, "任务码必填");
        }
        Map<String, Object> result = completeTaskQuiet(userId, code.trim(), body.getBizId());
        return R.ok(result);
    }

    @Operation(summary = "绑定邀请关系")
    @PostMapping("/invite/bind")
    public R<Map<String, Object>> bindInvite(@RequestBody InviteBody body) {
        Long inviteeId = SecurityUtils.getCurrentUserId();
        Map<String, Object> data = new HashMap<>();
        if (body == null || body.getInviterId() == null || body.getInviterId().equals(inviteeId)) {
            data.put("bound", false);
            data.put("reason", "invalid");
            return R.ok(data);
        }
        InviteRelation exists = inviteRelationMapper.selectOne(new LambdaQueryWrapper<InviteRelation>()
                .eq(InviteRelation::getInviteeId, inviteeId).last("LIMIT 1"));
        if (exists != null) {
            data.put("bound", false);
            data.put("reason", "already");
            return R.ok(data);
        }
        InviteRelation row = new InviteRelation();
        row.setInviterId(body.getInviterId());
        row.setInviteeId(inviteeId);
        row.setScene(body.getScene());
        row.setRewardStatus("pending");
        row.setCreateTime(LocalDateTime.now());
        inviteRelationMapper.insert(row);
        completeTaskQuiet(body.getInviterId(), "share_content", String.valueOf(inviteeId));
        data.put("bound", true);
        return R.ok(data);
    }

    @Operation(summary = "页面 A/B 分桶")
    @GetMapping("/pages/{pageId}/experiment")
    public R<Map<String, Object>> pageExperiment(@PathVariable Long pageId) {
        PageExperiment exp = pageExperimentMapper.selectOne(new LambdaQueryWrapper<PageExperiment>()
                .eq(PageExperiment::getPageId, pageId)
                .eq(PageExperiment::getStatus, "running")
                .last("LIMIT 1"));
        Map<String, Object> data = new HashMap<>();
        if (exp == null) {
            data.put("active", false);
            return R.ok(data);
        }
        Long userId = null;
        try { userId = SecurityUtils.getCurrentUserId(); } catch (Exception ignored) {}
        int bucket = Math.floorMod(Objects.hash(userId == null ? "anon" : userId, pageId), 100);
        boolean useB = bucket < (exp.getTrafficB() == null ? 50 : exp.getTrafficB());
        data.put("active", true);
        data.put("experimentId", exp.getId());
        data.put("bucket", useB ? "B" : "A");
        data.put("versionId", useB ? exp.getVersionB() : exp.getVersionA());
        return R.ok(data);
    }

    private void syncCheckinRow(Long userId, Integer streak, Integer points) {
        LocalDate today = LocalDate.now();
        MemberCheckin exists = memberCheckinMapper.selectOne(new LambdaQueryWrapper<MemberCheckin>()
                .eq(MemberCheckin::getUserId, userId)
                .eq(MemberCheckin::getCheckinDate, today)
                .last("LIMIT 1"));
        if (exists != null) return;
        MemberCheckin row = new MemberCheckin();
        row.setUserId(userId);
        row.setCheckinDate(today);
        row.setStreak(streak == null ? 1 : streak);
        row.setPoints(points == null ? 0 : points);
        row.setCreateTime(LocalDateTime.now());
        memberCheckinMapper.insert(row);
    }

    private Map<String, Object> completeTaskQuiet(Long userId, String code, String bizId) {
        Map<String, Object> data = new HashMap<>();
        MemberTask task = memberTaskMapper.selectOne(new LambdaQueryWrapper<MemberTask>()
                .eq(MemberTask::getCode, code).eq(MemberTask::getEnabled, 1).last("LIMIT 1"));
        if (task == null) {
            data.put("ok", false);
            data.put("reason", "unknown_task");
            return data;
        }
        LocalDateTime dayStart = LocalDate.now().atStartOfDay();
        long done = memberTaskLogMapper.selectCount(new LambdaQueryWrapper<MemberTaskLog>()
                .eq(MemberTaskLog::getUserId, userId)
                .eq(MemberTaskLog::getTaskCode, code)
                .ge(MemberTaskLog::getCreateTime, dayStart));
        int limit = task.getDailyLimit() == null ? 1 : task.getDailyLimit();
        if (done >= limit) {
            data.put("ok", false);
            data.put("reason", "limit");
            return data;
        }
        MemberTaskLog log = new MemberTaskLog();
        log.setUserId(userId);
        log.setTaskCode(code);
        log.setPoints(task.getPoints());
        log.setBizId(bizId);
        log.setCreateTime(LocalDateTime.now());
        memberTaskLogMapper.insert(log);
        try {
            memberPointsService.adminAdjustPoints(userId, task.getPoints(), "任务：" + task.getName());
        } catch (Exception ignored) {}
        data.put("ok", true);
        data.put("points", task.getPoints());
        return data;
    }

    private List<Map<String, Object>> topN(Map<String, Integer> map, int n) {
        return map.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                .limit(n)
                .map(e -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("keyword", e.getKey());
                    m.put("count", e.getValue());
                    return m;
                }).toList();
    }

    @Data
    public static class EventBody {
        private String eventName;
        private String page;
        private String componentId;
        private String itemId;
        private String props;
        private String sourceChannel;
        private Long inviterId;
    }

    @Data
    public static class SearchBody {
        private String keyword;
        private Integer resultCount;
        private String page;
    }

    @Data
    public static class TaskBody {
        private String code;
        private String bizId;
    }

    @Data
    public static class InviteBody {
        private Long inviterId;
        private String scene;
    }
}
