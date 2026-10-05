package com.miniprogram.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.entity.NoticeCampaign;
import com.miniprogram.entity.NoticeSceneConfig;
import com.miniprogram.entity.User;
import com.miniprogram.entity.UserNotice;
import com.miniprogram.entity.UserSegment;
import com.miniprogram.mapper.NoticeCampaignMapper;
import com.miniprogram.mapper.NoticeSceneConfigMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.mapper.UserNoticeMapper;
import com.miniprogram.mapper.UserSegmentMapper;
import com.miniprogram.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 通知中心：运营主动群发站内信 + 发送记录 + 场景开关。
 * <p>此前站内信只有系统自动写入（UserNoticeService 6 处），运营没有任何入口，
 * 也没有任何地方能查「这条通知谁读了」。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NoticeOpsService {

    /** 单次群发上限，防止一条 SQL 拉全表把内存打爆 */
    private static final int BROADCAST_LIMIT = 20000;
    private static final int PAGE_SIZE = 20;

    private final NoticeCampaignMapper campaignMapper;
    private final NoticeSceneConfigMapper sceneConfigMapper;
    private final UserNoticeMapper userNoticeMapper;
    private final UserSegmentMapper userSegmentMapper;
    private final UserMapper userMapper;
    private final UserNoticeService userNoticeService;
    private final MemberOpsService memberOpsService;

    // ==================== 群发 ====================

    /**
     * 按人群条件群发站内信。
     *
     * @param audience all=全部用户 / segment=指定分群 / member=有有效会员资格 / recent=近期活跃
     */
    @Transactional
    public Map<String, Object> broadcast(Map<String, Object> body) {
        String title = str(body, "title");
        String content = str(body, "content");
        if (!StringUtils.hasText(title)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "通知标题必填");
        }
        if (!StringUtils.hasText(content)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "通知内容必填");
        }
        String audience = defaultIfBlank(str(body, "audience"), "all");
        String link = normalizeLink(str(body, "link"));
        Long segmentId = longOrNull(body.get("segmentId"));

        List<Long> targets = resolveTargets(audience, segmentId);

        NoticeCampaign row = new NoticeCampaign();
        row.setTitle(title.trim());
        row.setContent(content.trim());
        row.setScene("manual");
        row.setLink(link);
        row.setAudience(audience);
        row.setSegmentId(segmentId);
        row.setTargetCount(targets.size());
        row.setSentCount(0);
        row.setReadCount(0);
        row.setStatus("sent");
        row.setCreatedBy(currentAdminId());
        row.setCreateTime(LocalDateTime.now());
        row.setSentTime(LocalDateTime.now());
        campaignMapper.insert(row);

        int sent = userNoticeService.broadcast(targets, String.valueOf(row.getId()), title.trim(), content.trim(), link);
        row.setSentCount(sent);
        campaignMapper.updateById(row);

        return Map.of(
                "campaignId", row.getId(),
                "targetCount", targets.size(),
                "sentCount", sent);
    }

    /**
     * 人群解析。segment 分支复用 MemberOpsService.resolveSegmentUsers，
     * 与「分群触达」保持同一口径。
     */
    private List<Long> resolveTargets(String audience, Long segmentId) {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        if ("segment".equals(audience)) {
            if (segmentId == null) {
                throw new BusinessException(ErrorCode.PARAM_ERROR, "请选择目标分群");
            }
            UserSegment segment = userSegmentMapper.selectById(segmentId);
            if (segment == null) {
                throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "分群不存在");
            }
            return memberOpsService.resolveSegmentUsers(segment.getRuleCode()).stream()
                    .map(User::getId)
                    .collect(Collectors.toList());
        }
        if ("member".equals(audience)) {
            // 有有效会员资格：用未过期且非空的 member_expire_at 近似，避免额外 join 会员表
            wrapper.isNotNull(User::getMemberExpireAt).gt(User::getMemberExpireAt, LocalDateTime.now());
        } else if ("recent".equals(audience)) {
            wrapper.ge(User::getLastVisitAt, LocalDateTime.now().minusDays(30));
        }
        wrapper.last("LIMIT " + BROADCAST_LIMIT);
        return userMapper.selectList(wrapper).stream().map(User::getId)
                .collect(Collectors.toList());
    }

    // ==================== 发送记录 ====================

    public Map<String, Object> listCampaigns(int current, int size, String status) {
        int page = Math.max(1, current);
        int limit = size <= 0 ? PAGE_SIZE : Math.min(size, 100);
        LambdaQueryWrapper<NoticeCampaign> wrapper = new LambdaQueryWrapper<NoticeCampaign>()
                .orderByDesc(NoticeCampaign::getCreateTime);
        if (StringUtils.hasText(status)) {
            wrapper.eq(NoticeCampaign::getStatus, status);
        }
        Page<NoticeCampaign> pageResult = campaignMapper.selectPage(new Page<>(page, limit), wrapper);
        List<Map<String, Object>> records = new ArrayList<>();
        for (NoticeCampaign c : pageResult.getRecords()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", c.getId());
            m.put("title", c.getTitle());
            m.put("content", c.getContent());
            m.put("link", c.getLink());
            m.put("audience", c.getAudience());
            m.put("targetCount", c.getTargetCount());
            m.put("sentCount", c.getSentCount());
            // 已读数按 bizKey 前缀回查（bizKey = campaign:<id>:<userId>）
            m.put("readCount", countRead(c.getId()));
            m.put("status", c.getStatus());
            m.put("createTime", c.getCreateTime());
            m.put("sentTime", c.getSentTime());
            records.add(m);
        }
        return Map.of("total", pageResult.getTotal(), "records", records);
    }

    private long countRead(Long campaignId) {
        if (campaignId == null) {
            return 0L;
        }
        return userNoticeMapper.selectCount(new LambdaQueryWrapper<UserNotice>()
                .likeRight(UserNotice::getBizKey, "campaign:" + campaignId + ":")
                .eq(UserNotice::getIsRead, 1));
    }

    // ==================== 场景开关 ====================

    public List<Map<String, Object>> listScenes() {
        List<NoticeSceneConfig> rows = sceneConfigMapper.selectList(
                new LambdaQueryWrapper<NoticeSceneConfig>().orderByAsc(NoticeSceneConfig::getSortNo));
        List<Map<String, Object>> out = new ArrayList<>();
        for (NoticeSceneConfig r : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("scene", r.getScene());
            m.put("label", r.getLabel());
            m.put("enabled", r.getEnabled() != null && r.getEnabled() != 0);
            m.put("sortNo", r.getSortNo());
            out.add(m);
        }
        return out;
    }

    @Transactional
    public void updateScene(String scene, boolean enabled) {
        int n = sceneConfigMapper.update(null, new LambdaUpdateWrapper<NoticeSceneConfig>()
                .eq(NoticeSceneConfig::getScene, scene)
                .set(NoticeSceneConfig::getEnabled, enabled ? 1 : 0));
        if (n == 0) {
            NoticeSceneConfig row = new NoticeSceneConfig();
            row.setScene(scene);
            row.setLabel(scene);
            row.setEnabled(enabled ? 1 : 0);
            row.setSortNo(999);
            sceneConfigMapper.insert(row);
        }
        // 立即失效缓存，运营改完开关下一条通知就按新配置走
        userNoticeService.evictSceneSwitchCache();
    }

    // ==================== 统计 ====================

    public Map<String, Object> stats() {
        long campaigns = campaignMapper.selectCount(null);
        long sentTotal = userNoticeMapper.selectCount(
                new LambdaQueryWrapper<UserNotice>().eq(UserNotice::getScene, "manual"));
        long unread = userNoticeMapper.selectCount(
                new LambdaQueryWrapper<UserNotice>().eq(UserNotice::getIsRead, 0));
        return Map.of("campaigns", campaigns, "manualSent", sentTotal, "unread", unread);
    }

    // ==================== 工具 ====================

    /** 小程序路径必须是 /pkg-xxx/xxx/xxx 形式，非法路径会让点击跳转白屏 */
    private String normalizeLink(String link) {
        if (!StringUtils.hasText(link)) {
            return null;
        }
        String v = link.trim();
        if (!v.startsWith("/")) {
            return null;
        }
        if (v.contains("..") || v.startsWith("//")) {
            return null;
        }
        return v;
    }

    private Long currentAdminId() {
        try {
            return SecurityUtils.getCurrentUserId();
        } catch (Exception e) {
            return null;
        }
    }

    private static String str(Map<String, Object> body, String key) {
        Object v = body == null ? null : body.get(key);
        return v == null ? null : String.valueOf(v);
    }

    private static String defaultIfBlank(String v, String fallback) {
        return StringUtils.hasText(v) ? v.trim() : fallback;
    }

    private static Long longOrNull(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.longValue();
        String s = String.valueOf(v).trim();
        if (s.isEmpty() || "null".equals(s)) return null;
        try {
            return Long.parseLong(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
