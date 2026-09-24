package com.miniprogram.compliance;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.entity.MiniProgramUser;
import com.miniprogram.mapper.MiniProgramUserMapper;
import com.miniprogram.service.WxMiniappTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * 微信内容安全 v2（fail-closed：异常/超时 → 待人审，不自动放行发布）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WxContentSecurityService {

    public enum Decision { PASS, REVIEW, REJECT }

    public record CheckResult(Decision decision, String reason, String suggest, Integer label) {}

    private final WxMiniappTokenService wxMiniappTokenService;
    private final MiniProgramUserMapper miniProgramUserMapper;
    private final ComplianceAuditService complianceAuditService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public CheckResult checkTextForPublish(Long userId, String title, String content, int scene) {
        return checkText(userId, title, content, scene, "content_publish");
    }

    public CheckResult checkTextForComment(Long userId, String content) {
        return checkText(userId, null, content, 2, "content_comment");
    }

    @SuppressWarnings("unchecked")
    private CheckResult checkText(Long userId, String title, String body, int scene, String auditType) {
        String text = StringUtils.hasText(body) ? body.trim() : "";
        if (!StringUtils.hasText(text)) {
            return new CheckResult(Decision.PASS, null, "pass", 100);
        }
        String openid = resolveOpenid(userId);
        if (!StringUtils.hasText(openid)) {
            complianceAuditService.log(auditType, "user", userId == null ? null : String.valueOf(userId),
                    userId, null, "review", "缺少 openid，待人审", Map.of("scene", scene));
            return new CheckResult(Decision.REVIEW, "内容将进入人工审核", "review", null);
        }
        try {
            String token = wxMiniappTokenService.getAccessToken();
            String url = "https://api.weixin.qq.com/wxa/msg_sec_check?access_token=" + token;
            Map<String, Object> req = new HashMap<>();
            req.put("content", text.length() > 2500 ? text.substring(0, 2500) : text);
            req.put("version", 2);
            req.put("scene", scene);
            req.put("openid", openid);
            if (StringUtils.hasText(title)) {
                req.put("title", title.length() > 2500 ? title.substring(0, 2500) : title);
            }
            ResponseEntity<Map> resp = restTemplate.postForEntity(url, req, Map.class);
            Map<?, ?> json = resp.getBody();
            if (json == null) {
                return review(auditType, userId, "empty response");
            }
            int errcode = parseInt(json.get("errcode"), 0);
            if (errcode == 87014) {
                return reject("微信判定违规", auditType, userId);
            }
            if (errcode != 0) {
                return review(auditType, userId, "errcode=" + errcode);
            }
            Object resultObj = json.get("result");
            if (resultObj instanceof Map<?, ?> result) {
                String suggest = result.get("suggest") == null ? "" : String.valueOf(result.get("suggest"));
                Integer label = result.get("label") == null ? null : parseInt(result.get("label"), null);
                if ("pass".equalsIgnoreCase(suggest)) {
                    return new CheckResult(Decision.PASS, null, suggest, label);
                }
                if ("risky".equalsIgnoreCase(suggest)) {
                    return reject("微信内容安全：" + suggest, auditType, userId);
                }
                return review(auditType, userId, "suggest=" + suggest);
            }
            return review(auditType, userId, "no result node");
        } catch (Exception e) {
            log.warn("msgSecCheck v2 failed: {}", e.getMessage());
            return review(auditType, userId, e.getMessage());
        }
    }

    private CheckResult review(String auditType, Long userId, String reason) {
        complianceAuditService.log(auditType, "user", userId == null ? null : String.valueOf(userId),
                userId, null, "review", reason, null);
        return new CheckResult(Decision.REVIEW, "内容将进入人工审核", "review", null);
    }

    private CheckResult reject(String reason, String auditType, Long userId) {
        complianceAuditService.log(auditType, "user", userId == null ? null : String.valueOf(userId),
                userId, null, "reject", reason, null);
        return new CheckResult(Decision.REJECT, reason, "risky", null);
    }

    private String resolveOpenid(Long userId) {
        if (userId == null) {
            return null;
        }
        MiniProgramUser user = miniProgramUserMapper.selectById(userId);
        return user == null ? null : user.getOpenid();
    }

    private static int parseInt(Object o, Integer def) {
        if (o == null) return def == null ? 0 : def;
        try {
            return Integer.parseInt(String.valueOf(o));
        } catch (Exception e) {
            return def == null ? 0 : def;
        }
    }
}
