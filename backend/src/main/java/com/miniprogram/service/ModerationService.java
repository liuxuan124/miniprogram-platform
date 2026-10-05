package com.miniprogram.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.entity.CopyrightComplaint;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.CopyrightComplaintMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.security.JwtBlacklistService;
import com.miniprogram.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 审核中心：举报受理 + 用户封禁。
 *
 * <p>2026-10-05 补齐。此前 {@code mp_copyright_complaint} 表存在但全仓零实体/零接口，
 * 小程序 C 端两处「举报」只弹 toast 不发请求，故表内 0 行 —— 举报功能实质不可用。
 *
 * <p><b>封禁的完整链路</b>：写 {@code mp_user.status=banned} + 调
 * {@link JwtBlacklistService#revokeAllForUser} 吊销该用户已签发的 token。
 * <b>只改 DB 不吊销 token 是无效封禁</b> —— 用户手上的 token 在 2h 内仍能调通接口。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ModerationService {

    /** 举报对象类型白名单（与 Schema 注释保持一致） */
    public static final Set<String> TARGET_TYPES = new HashSet<>(Arrays.asList(
            "content", "moment", "comment", "planet_post", "product", "author"));

    /** 受理状态白名单 */
    public static final Set<String> HANDLE_STATUSES = new HashSet<>(Arrays.asList(
            "accepted", "rejected"));

    private static final int MAX_REASON_LEN = 500;
    private static final int MAX_EVIDENCE = 6;

    private final CopyrightComplaintMapper complaintMapper;
    private final UserMapper userMapper;
    private final JwtBlacklistService jwtBlacklistService;
    private final ObjectMapper objectMapper;

    // ==================== C 端：提交举报 ====================

    /**
     * C 端提交举报。
     *
     * @param reporterUserId 可为 null（未登录时也能举报，微信平台要求举报可用）
     */
    public CopyrightComplaint submit(String targetType, Long targetId, String reason,
                                    String contact, List<String> evidenceUrls, Long reporterUserId) {
        String tt = targetType == null ? "" : targetType.trim();
        if (!TARGET_TYPES.contains(tt)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "举报对象类型不合法，可选：" + String.join("/", TARGET_TYPES));
        }
        if (targetId == null || targetId <= 0) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "举报对象不能为空");
        }
        String r = reason == null ? "" : reason.trim();
        if (r.isEmpty()) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "请填写举报理由");
        }
        if (r.length() > MAX_REASON_LEN) {
            r = r.substring(0, MAX_REASON_LEN);
        }
        if (StringUtils.hasText(contact) && contact.trim().length() > 128) {
            contact = contact.trim().substring(0, 128);
        }

        CopyrightComplaint row = new CopyrightComplaint();
        row.setTargetType(tt);
        row.setTargetId(targetId);
        row.setReason(r);
        row.setContact(contact == null ? null : contact.trim());
        row.setReporterUserId(reporterUserId);
        // status 用数据库默认值 pending（V-迁移里定义的 DEFAULT 'pending'）
        row.setEvidenceUrls(toJson(limitEvidence(evidenceUrls)));
        complaintMapper.insert(row);
        log.info("[审核中心] 收到举报 targetType={} targetId={} reporter={}", tt, targetId, reporterUserId);
        return row;
    }

    // ==================== 后台：查询 ====================

    public Page<CopyrightComplaint> pageComplaints(String status, int current, int size) {
        int sz = Math.min(Math.max(size, 1), 100);
        int cur = Math.max(current, 1);
        LambdaQueryWrapper<CopyrightComplaint> w = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(status) && !"all".equalsIgnoreCase(status)) {
            w.eq(CopyrightComplaint::getStatus, status.trim());
        }
        w.orderByDesc(CopyrightComplaint::getCreatedAt);
        return complaintMapper.selectPage(new Page<>(cur, sz), w);
    }

    /** 待处理数量，用于列表页角标 */
    public long countPendingComplaints() {
        return complaintMapper.selectCount(
                new LambdaQueryWrapper<CopyrightComplaint>().eq(CopyrightComplaint::getStatus, "pending"));
    }

    // ==================== 后台：处理举报 ====================

    /**
     * 处理举报。
     *
     * @param banTarget 是否连带封禁被举报对象对应的用户（仅当 targetType 指向用户类内容时有意义）
     */
    public CopyrightComplaint handle(Long id, String status, String adminNote, boolean banTarget) {
        String st = status == null ? "" : status.trim();
        if (!HANDLE_STATUSES.contains(st)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "处理结果不合法，可选：accepted / rejected");
        }
        CopyrightComplaint row = complaintMapper.selectById(id);
        if (row == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "举报不存在或已删除");
        }
        if ("accepted".equals(row.getStatus())) {
            // 已受理的不允许改判，避免运营反复横跳造成台账失真
            throw new BusinessException(ErrorCode.PARAM_ERROR, "该举报已受理，不能重复处理");
        }
        row.setStatus(st);
        row.setAdminNote(adminNote == null ? null : (adminNote.length() > 500 ? adminNote.substring(0, 500) : adminNote));
        row.setHandlerId(SecurityUtils.getCurrentUserId());
        row.setHandledAt(LocalDateTime.now());
        complaintMapper.updateById(row);

        if (banTarget) {
            Long ownerId = resolveTargetOwner(row.getTargetType(), row.getTargetId());
            if (ownerId == null) {
                log.warn("[审核中心] 举报 {} 勾选了封禁，但无法解析出被举报用户 targetType={} targetId={}",
                        id, row.getTargetType(), row.getTargetId());
            } else {
                banUser(ownerId, "举报受理：" + (adminNote == null ? row.getReason() : adminNote));
            }
        }
        return row;
    }

    // ==================== 后台：封禁 ====================

    /**
     * 封禁 C 端用户：改 status + 吊销其已签发 token。
     *
     * <p><b>吊销这一步不能省</b>：JWT 是无状态的，只改 DB 的话用户手上的 token 在有效期内
     * 仍能正常调通接口，等于没封。
     */
    public User banUser(Long userId, String reason) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "用户不存在");
        }
        User u = userMapper.selectById(userId);
        if (u == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "用户不存在");
        }
        if ("banned".equals(u.getStatus())) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "该用户已是封禁态");
        }
        String r = reason == null ? "" : reason.trim();
        if (r.length() > 255) {
            r = r.substring(0, 255);
        }
        User patch = new User();
        patch.setId(userId);
        patch.setStatus("banned");
        patch.setBannedReason(r.isEmpty() ? "违规" : r);
        patch.setBannedAt(LocalDateTime.now());
        userMapper.updateById(patch);

        jwtBlacklistService.revokeAllForUser(userId);
        log.warn("[审核中心] 已封禁用户 userId={} reason={}，并吊销其已签发 token", userId, r);
        return userMapper.selectById(userId);
    }

    /** 解封：恢复 active，并再次吊销（让被封期间不该有的旧 token 保持失效） */
    public User unbanUser(Long userId) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "用户不存在");
        }
        User u = userMapper.selectById(userId);
        if (u == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "用户不存在");
        }
        User patch = new User();
        patch.setId(userId);
        patch.setStatus("active");
        patch.setBannedReason(null);
        patch.setBannedAt(null);
        userMapper.updateById(patch);
        // 再次写吊销时间戳：解封前的 token 无论如何都不能复活
        jwtBlacklistService.revokeAllForUser(userId);
        log.info("[审核中心] 已解封用户 userId={}", userId);
        return userMapper.selectById(userId);
    }

    /** 被封禁用户主动登录时拦截：返回提示语，未封禁返回 null */
    public String checkLoginBlocked(Long userId) {
        if (userId == null) {
            return null;
        }
        User u = userMapper.selectById(userId);
        if (u == null || !"banned".equals(u.getStatus())) {
            return null;
        }
        String reason = StringUtils.hasText(u.getBannedReason()) ? u.getBannedReason() : "违反社区规范";
        return "账号已被封禁：" + reason;
    }

    // ==================== 内部 ====================

    /**
     * 从举报对象反查所属用户。
     * <p>这里只处理「直接能拿到 userId」的类型；content/moment 等需要联表查内容表的
     * author_id/user_id，交给后续按需补。当前找不到就返回 null，调用方只打 warn 不封。
     */
    private Long resolveTargetOwner(String targetType, Long targetId) {
        if (targetType == null || targetId == null) {
            return null;
        }
        // 目前只有「举报作者本人」能直接拿到用户 id
        if ("author".equals(targetType)) {
            return targetId;
        }
        return null;
    }

    private List<String> limitEvidence(List<String> urls) {
        if (urls == null || urls.isEmpty()) {
            return null;
        }
        List<String> out = new ArrayList<>();
        for (String u : urls) {
            if (!StringUtils.hasText(u)) {
                continue;
            }
            String s = u.trim();
            // 只接受 http(s)，挡掉 javascript: 之类
            if (!s.startsWith("http://") && !s.startsWith("https://")) {
                continue;
            }
            if (s.length() > 500) {
                s = s.substring(0, 500);
            }
            out.add(s);
            if (out.size() >= MAX_EVIDENCE) {
                break;
            }
        }
        return out.isEmpty() ? null : out;
    }

    /** 实体里 evidenceUrls 是 String（JSON 列），这里做序列化 */
    private String toJson(List<String> list) {
        if (list == null || list.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            log.warn("[审核中心] 证据图序列化失败，已丢弃: {}", e.getMessage());
            return null;
        }
    }

    /** 供 Controller 把 JSON 字符串还原成数组 */
    public List<String> parseEvidence(String json) {
        if (!StringUtils.hasText(json)) {
            return List.of();
        }
        try {
            List<String> v = objectMapper.readValue(json, new TypeReference<List<String>>() {});
            return v == null ? List.of() : v;
        } catch (Exception e) {
            return List.of();
        }
    }

    /** 供后台列表页拼出被举报对象的可读信息（昵称/标题） */
    public String describeTarget(CopyrightComplaint row) {
        if (row == null) {
            return "";
        }
        return TARGET_LABELS.getOrDefault(row.getTargetType(), row.getTargetType()) + " #" + row.getTargetId();
    }

    private static final java.util.Map<String, String> TARGET_LABELS = java.util.Map.of(
            "content", "内容",
            "moment", "动态",
            "comment", "评论",
            "planet_post", "星球动态",
            "product", "商品",
            "author", "作者");

    /** 供后台筛选项 */
    public List<String> targetTypeOptions() {
        return TARGET_TYPES.stream().sorted().collect(Collectors.toList());
    }
}
