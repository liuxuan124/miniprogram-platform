package com.miniprogram.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.miniprogram.common.R;
import com.miniprogram.entity.CopyrightComplaint;
import com.miniprogram.entity.User;
import com.miniprogram.service.ModerationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 运营中心 › 审核中心（后台侧）：举报处理 + 用户封禁。
 *
 * <p>路径刻意用 {@code /api/v1/admin/ops/moderation/**} 而非 {@code /api/v1/admin/compliance}：
 * - 前者不在 {@code SecurityConfig} 的 super_admin 专属前缀里，运营角色（content_ops/biz_ops）可用；
 * - 后者的权限注解写的是 {@code hasAuthority('content:audit')}，而该权限码在 mp_permission 里
 *   <b>根本不存在</b>（content 模块只有 list/create/update/delete/publish/agent），
 *   导致该分支恒为 false、运营调现有合规接口直接 403。
 *
 * <p>本类<b>刻意不加 {@code @PreAuthorize}</b>，与「运营中心」其余模块（私域引流、搜索运营）
 * 保持同一权限口径：只要求登录。若后续要按角色细分，应先在 mp_permission 里补齐权限码再挂注解，
 * 不要用不存在的码。
 */
@Slf4j
@Tag(name = "运营中心-审核中心")
@RestController
@RequestMapping("/api/v1/admin/ops/moderation")
@RequiredArgsConstructor
public class AdminModerationController {

    private final ModerationService moderationService;

    @Operation(summary = "举报列表（分页）")
    @GetMapping("/complaints")
    public R<Page<ComplaintVO>> complaints(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "20") int size) {
        Page<CopyrightComplaint> p = moderationService.pageComplaints(status, current, size);
        List<ComplaintVO> vos = p.getRecords().stream().map(this::toVO).collect(java.util.stream.Collectors.toList());
        Page<ComplaintVO> out = new Page<>(p.getCurrent(), p.getSize(), p.getTotal());
        out.setRecords(vos);
        return R.ok(out);
    }

    @Operation(summary = "待处理举报数（角标）")
    @GetMapping("/pending-count")
    public R<Long> pendingCount() {
        return R.ok(moderationService.countPendingComplaints());
    }

    @Operation(summary = "举报对象类型枚举（前端筛选项）")
    @GetMapping("/target-types")
    public R<List<String>> targetTypes() {
        return R.ok(moderationService.targetTypeOptions());
    }

    @Operation(summary = "处理举报：受理 / 驳回")
    @PutMapping("/complaints/{id}/handle")
    public R<ComplaintVO> handle(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestParam(required = false) String note,
            @RequestParam(defaultValue = "false") boolean banTarget) {
        CopyrightComplaint row = moderationService.handle(id, status, note, banTarget);
        return R.ok(toVO(row));
    }

    @Operation(summary = "封禁 C 端用户")
    @PostMapping("/users/{id}/ban")
    public R<User> ban(@PathVariable Long id, @RequestParam(required = false) String reason) {
        return R.ok(moderationService.banUser(id, reason));
    }

    @Operation(summary = "解封")
    @PostMapping("/users/{id}/unban")
    public R<User> unban(@PathVariable Long id) {
        return R.ok(moderationService.unbanUser(id));
    }

    @Operation(summary = "查用户封禁状态")
    @GetMapping("/users/{id}/ban-status")
    public R<Map<String, Object>> banStatus(@PathVariable Long id) {
        String blocked = moderationService.checkLoginBlocked(id);
        Map<String, Object> m = new java.util.HashMap<>();
        m.put("banned", blocked != null);
        m.put("reason", blocked);
        return R.ok(m);
    }

    private ComplaintVO toVO(CopyrightComplaint row) {
        ComplaintVO vo = new ComplaintVO();
        vo.setId(row.getId());
        vo.setTargetType(row.getTargetType());
        vo.setTargetLabel(moderationService.describeTarget(row));
        vo.setTargetId(row.getTargetId());
        vo.setReporterUserId(row.getReporterUserId());
        vo.setContact(row.getContact());
        vo.setReason(row.getReason());
        vo.setStatus(row.getStatus());
        vo.setAdminNote(row.getAdminNote());
        vo.setHandlerId(row.getHandlerId());
        vo.setHandledAt(row.getHandledAt());
        vo.setEvidenceUrls(moderationService.parseEvidence(row.getEvidenceUrls()));
        vo.setCreatedAt(row.getCreatedAt());
        return vo;
    }

    /** 举报 VO：把 evidenceUrls 的 JSON 字符串还原成数组，避免前端自己 parse */
    public static class ComplaintVO {
        private Long id;
        private String targetType;
        private String targetLabel;
        private Long targetId;
        private Long reporterUserId;
        private String contact;
        private String reason;
        private String status;
        private String adminNote;
        private Long handlerId;
        @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
        private LocalDateTime handledAt;
        private List<String> evidenceUrls;
        @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
        private LocalDateTime createdAt;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getTargetType() { return targetType; }
        public void setTargetType(String targetType) { this.targetType = targetType; }
        public String getTargetLabel() { return targetLabel; }
        public void setTargetLabel(String targetLabel) { this.targetLabel = targetLabel; }
        public Long getTargetId() { return targetId; }
        public void setTargetId(Long targetId) { this.targetId = targetId; }
        public Long getReporterUserId() { return reporterUserId; }
        public void setReporterUserId(Long reporterUserId) { this.reporterUserId = reporterUserId; }
        public String getContact() { return contact; }
        public void setContact(String contact) { this.contact = contact; }
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getAdminNote() { return adminNote; }
        public void setAdminNote(String adminNote) { this.adminNote = adminNote; }
        public Long getHandlerId() { return handlerId; }
        public void setHandlerId(Long handlerId) { this.handlerId = handlerId; }
        public LocalDateTime getHandledAt() { return handledAt; }
        public void setHandledAt(LocalDateTime handledAt) { this.handledAt = handledAt; }
        public List<String> getEvidenceUrls() { return evidenceUrls; }
        public void setEvidenceUrls(List<String> evidenceUrls) { this.evidenceUrls = evidenceUrls; }
        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    }
}
