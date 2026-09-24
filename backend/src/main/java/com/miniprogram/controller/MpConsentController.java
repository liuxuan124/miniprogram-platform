package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.compliance.CommerceVirtualRefundService;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.SystemConfigService;
import com.miniprogram.service.UserConsentService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@Tag(name = "小程序-合规同意")
@RestController
@RequestMapping("/api/v1/mp/consent")
@RequiredArgsConstructor
public class MpConsentController {

    private final UserConsentService userConsentService;
    private final CommerceVirtualRefundService commerceVirtualRefundService;
    private final SystemConfigService systemConfigService;
    private final ObjectMapper objectMapper;

    @GetMapping("/status")
    @Operation(summary = "隐私/协议版本与是否已同意")
    public R<Map<String, Object>> status() {
        Long userId = SecurityUtils.getCurrentUserId();
        Map<String, String> versions = readLegalVersions();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("legalVersions", versions);
        out.put("virtualRefundRules", commerceVirtualRefundService.publicSummary());
        if (userId != null && userId > 0) {
            out.put("privacyAgreed", userConsentService.hasAgreed(userId, "privacy", versions.get("privacy")));
            out.put("termsAgreed", userConsentService.hasAgreed(userId, "terms", versions.get("terms")));
        }
        return R.ok(out);
    }

    @PostMapping
    @Operation(summary = "记录用户同意（隐私/条款/虚拟退款规则）")
    public R<Void> record(@RequestBody ConsentBody body, HttpServletRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null || userId <= 0) {
            return R.fail(401001, "请先登录");
        }
        if (body == null || !StringUtils.hasText(body.getConsentType())) {
            return R.fail(400001, "consentType 必填");
        }
        String version = StringUtils.hasText(body.getVersion())
                ? body.getVersion()
                : defaultVersion(body.getConsentType());
        userConsentService.recordConsent(
                userId,
                body.getConsentType(),
                version,
                body.getAgreed() == null || body.getAgreed(),
                clientIp(request),
                request.getHeader("User-Agent"));
        return R.ok();
    }

    private String defaultVersion(String consentType) {
        if ("virtual_refund".equals(consentType)) {
            return commerceVirtualRefundService.consentClauseVersion();
        }
        Map<String, String> legal = readLegalVersions();
        return legal.getOrDefault(consentType, "draft");
    }

    private Map<String, String> readLegalVersions() {
        try {
            String raw = systemConfigService.getConfigValue("legal_agreement_versions");
            if (!StringUtils.hasText(raw)) {
                return Map.of("privacy", "draft", "terms", "draft");
            }
            return objectMapper.readValue(raw, new TypeReference<>() {});
        } catch (Exception e) {
            return Map.of("privacy", "draft", "terms", "draft");
        }
    }

    private static String clientIp(HttpServletRequest request) {
        if (request == null) return null;
        String xff = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(xff)) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    @Data
    public static class ConsentBody {
        private String consentType;
        private String version;
        private Boolean agreed;
    }
}
