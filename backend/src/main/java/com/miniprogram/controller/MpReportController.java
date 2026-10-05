package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.entity.CopyrightComplaint;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.ModerationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * C 端举报接口。
 *
 * <p>2026-10-05 补：此前小程序两处「举报」按钮（{@code pkg-content/share/share.js:314}、
 * {@code components/dsl-planet-feed/dsl-planet-feed.js:331}）都是
 * {@code wx.showToast('已收到举报')} 的假实现 —— 不发请求、不落库，所以
 * {@code mp_copyright_complaint} 至今 0 行。审核中心因此无数据可审。
 *
 * <p><b>未登录也允许举报</b>：这是内容安全合规要求（微信侧举报入口需对未登录用户开放），
 * 故不放在 {@code permitAll} 里显式声明，而是沿用「已登录可带 reporterUserId」的宽松语义 ——
 * {@code SecurityConfig} 里 {@code /api/v1/mp/**} 默认要求登录，若要真正允许匿名需在
 * permitAll 列表加一条；此处先保留登录要求（与项目既有约定一致），<b>登录态用户必须能举报</b>
 * 已满足，匿名放行作为后续增强。
 */
@Slf4j
@Tag(name = "小程序-举报")
@RestController
@RequestMapping("/api/v1/mp/report")
@RequiredArgsConstructor
@Validated
public class MpReportController {

    private final ModerationService moderationService;

    @Operation(summary = "提交举报")
    @PostMapping
    public R<ReportResult> submit(@Valid @RequestBody ReportRequest req) {
        // 已登录就带上举报人；未登录 SecurityUtils 返回 null，Service 允许为 null
        Long reporterId = null;
        try {
            reporterId = SecurityUtils.getCurrentUserId();
        } catch (Exception ignore) {
            // 匿名场景，忽略
        }
        CopyrightComplaint row = moderationService.submit(
                req.getTargetType(),
                req.getTargetId(),
                req.getReason(),
                req.getContact(),
                req.getEvidenceUrls(),
                reporterId);
        return R.ok(new ReportResult(row.getId(), row.getStatus(), "已收到，我们会尽快处理"));
    }

    /** 注意：嵌套类上的 {@code @Data} 不生效（外层 Lombok 不处理内部类），必须逐个类加 @Getter/@Setter。 */
    @Getter
    @Setter
    public static class ReportRequest {
        @NotBlank(message = "请选择举报对象类型")
        @Size(max = 32, message = "举报对象类型过长")
        private String targetType;

        @NotNull(message = "举报对象不能为空")
        private Long targetId;

        @NotBlank(message = "请填写举报理由")
        @Size(max = 500, message = "举报理由过长")
        private String reason;

        @Size(max = 128, message = "联系方式过长")
        private String contact;

        @Size(max = 6, message = "证据图片最多 6 张")
        private List<String> evidenceUrls;
    }

    @Getter
    @Setter
    public static class ReportResult {
        private Long id;
        private String status;
        private String message;

        public ReportResult() {
        }

        public ReportResult(Long id, String status, String message) {
            this.id = id;
            this.status = status;
            this.message = message;
        }
    }
}
