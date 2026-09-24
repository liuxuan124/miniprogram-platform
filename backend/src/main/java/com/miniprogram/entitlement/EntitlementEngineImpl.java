package com.miniprogram.entitlement;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.entitlement.dto.EntitlementCheckResult;
import com.miniprogram.entitlement.dto.EntitlementPriceQuote;
import com.miniprogram.entitlement.dto.EntitlementUnlockOption;
import com.miniprogram.entity.Content;
import com.miniprogram.entity.ContentAccessRule;
import com.miniprogram.entity.FileItem;
import com.miniprogram.entity.Product;
import com.miniprogram.entity.EntitlementEventLog;
import com.miniprogram.entity.EntitlementQuota;
import com.miniprogram.mapper.ContentAccessRuleMapper;
import com.miniprogram.mapper.EntitlementEventLogMapper;
import com.miniprogram.mapper.EntitlementQuotaMapper;
import com.miniprogram.mapper.FileItemMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.member.MemberBenefitCodes;
import com.miniprogram.service.InviteContentUnlockService;
import com.miniprogram.service.MembershipAccessService;
import com.miniprogram.service.PurchaseEntitlementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class EntitlementEngineImpl implements EntitlementEngine {

    private static final Set<String> KNOWN_GRANTS = Set.of(
            "free", "login", "member", "planet", "product", "points", "invite");

    private final ContentAccessRuleMapper contentAccessRuleMapper;
    private final MembershipAccessService membershipAccessService;
    private final PurchaseEntitlementService purchaseEntitlementService;
    private final ProductMapper productMapper;
    private final FileItemMapper fileItemMapper;
    private final EntitlementEventLogMapper entitlementEventLogMapper;
    private final EntitlementQuotaMapper entitlementQuotaMapper;
    private final InviteContentUnlockService inviteContentUnlockService;
    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public EntitlementCheckResult checkContentAccess(Long userId, Content content) {
        if (content == null) {
            return EntitlementCheckResult.builder().allowed(false).reason("not_found").build();
        }
        ContentAccessRule rule = contentAccessRuleMapper.selectOne(
                new LambdaQueryWrapper<ContentAccessRule>()
                        .eq(ContentAccessRule::getContentId, content.getId())
                        .last("LIMIT 1"));

        List<String> grants = resolveGrants(content, rule);
        int previewPercent = resolvePreviewPercent(content, rule);

        if (grants.contains("free")) {
            return fullAccess(previewPercent, content.getContent());
        }

        boolean loggedIn = userId != null && userId > 0;
        if (grants.contains("login") && loggedIn) {
            return fullAccess(previewPercent, content.getContent());
        }

        if (grants.contains("member") && loggedIn
                && (membershipAccessService.hasPlatformMembership(userId)
                || membershipAccessService.hasBenefit(userId, MemberBenefitCodes.ARTICLE_FREE))) {
            return fullAccess(previewPercent, content.getContent());
        }

        String planetId = rule != null && StringUtils.hasText(rule.getPlanetId())
                ? rule.getPlanetId()
                : (StringUtils.hasText(content.getPlanetId()) ? content.getPlanetId()
                : membershipAccessService.resolveDefaultPlanetId());
        if (grants.contains("planet") && loggedIn
                && membershipAccessService.hasPlanetMembership(userId, planetId)) {
            return fullAccess(previewPercent, content.getContent());
        }

        Long payProductId = rule != null ? rule.getPayProductId() : null;
        if (payProductId == null && Integer.valueOf(1).equals(content.getPlanetExclusive())) {
            // 兼容旧数据：星球专属未写 rule 时仍走 planet grant
            grants = new ArrayList<>(grants);
            if (!grants.contains("planet")) {
                grants.add("planet");
            }
        }
        if (grants.contains("product") && payProductId != null && loggedIn
                && purchaseEntitlementService.hasProduct(userId, payProductId)) {
            return fullAccess(previewPercent, content.getContent());
        }

        if (grants.contains("invite") && loggedIn
                && inviteContentUnlockService.hasUnlockedViaInvite(content.getId(), userId)) {
            return fullAccess(previewPercent, content.getContent());
        }

        // 回退 legacy visibility
        if ("member_only".equalsIgnoreCase(content.getVisibility()) && loggedIn
                && membershipAccessService.hasPlatformMembership(userId)) {
            return fullAccess(previewPercent, content.getContent());
        }
        if (Integer.valueOf(1).equals(content.getPlanetExclusive()) && loggedIn
                && membershipAccessService.hasPlanetMembership(userId, planetId)) {
            return fullAccess(previewPercent, content.getContent());
        }

        return previewWithUnlock(content, rule, previewPercent, planetId, payProductId);
    }

    @Override
    public EntitlementCheckResult checkFileAccess(Long userId, Long fileId, String planetId) {
        FileItem item = fileItemMapper.selectById(fileId);
        if (item == null || !"published".equals(item.getStatus())) {
            return EntitlementCheckResult.builder().allowed(false).reason("not_found").build();
        }
        // 文件细粒度规则后续读 file 字段；P0 委托既有 audience 逻辑由 FileEntitlementService 包装调用
        boolean loggedIn = userId != null && userId > 0;
        if (!loggedIn) {
            return EntitlementCheckResult.builder()
                    .allowed(false)
                    .reason("login_required")
                    .unlockOptions(List.of(EntitlementUnlockOption.builder()
                            .type("login").label("登录后查看").build()))
                    .build();
        }
        return EntitlementCheckResult.builder().allowed(true).reason("ok").build();
    }

    @Override
    public EntitlementPriceQuote quoteProductPrice(Long userId, Long productId) {
        Product product = productMapper.selectById(productId);
        if (product == null) {
            return EntitlementPriceQuote.builder()
                    .listPrice(BigDecimal.ZERO)
                    .finalPrice(BigDecimal.ZERO)
                    .explain("商品不存在")
                    .build();
        }
        BigDecimal list = product.getPrice() != null ? product.getPrice() : BigDecimal.ZERO;
        BigDecimal member = membershipAccessService.applyShopPrice(userId, product, list);
        return EntitlementPriceQuote.builder()
                .listPrice(list)
                .memberPrice(member)
                .finalPrice(member != null ? member : list)
                .appliedDiscounts(member != null && member.compareTo(list) < 0
                        ? List.of("member_price") : List.of())
                .explain(member != null && member.compareTo(list) < 0 ? "会员价已生效" : "原价")
                .build();
    }

    @Override
    @Transactional
    public boolean consumeQuota(Long userId, String quotaType, int amount, String idempotencyKey) {
        if (userId == null || amount <= 0 || !StringUtils.hasText(idempotencyKey)) {
            return false;
        }
        EntitlementEventLog dup = entitlementEventLogMapper.selectOne(new LambdaQueryWrapper<EntitlementEventLog>()
                .eq(EntitlementEventLog::getIdempotencyKey, idempotencyKey.trim())
                .last("LIMIT 1"));
        if (dup != null) {
            return true;
        }
        String period = quotaType != null && quotaType.contains("monthly")
                ? monthlyPeriodKey() : dailyPeriodKey();
        EntitlementQuota quota = entitlementQuotaMapper.selectOne(new LambdaQueryWrapper<EntitlementQuota>()
                .eq(EntitlementQuota::getUserId, userId)
                .eq(EntitlementQuota::getQuotaType, quotaType)
                .eq(EntitlementQuota::getPeriodKey, period)
                .last("LIMIT 1"));
        if (quota == null) {
            quota = new EntitlementQuota();
            quota.setUserId(userId);
            quota.setQuotaType(quotaType);
            quota.setPeriodKey(period);
            quota.setBalance(0);
            quota.setUpdatedAt(java.time.LocalDateTime.now());
            entitlementQuotaMapper.insert(quota);
        }
        if (quota.getBalance() + amount > Integer.MAX_VALUE / 2) {
            return false;
        }
        quota.setBalance(quota.getBalance() + amount);
        quota.setUpdatedAt(java.time.LocalDateTime.now());
        entitlementQuotaMapper.updateById(quota);
        EntitlementEventLog logRow = new EntitlementEventLog();
        logRow.setIdempotencyKey(idempotencyKey.trim());
        logRow.setUserId(userId);
        logRow.setEventType("consume_quota");
        logRow.setResourceType("quota");
        logRow.setResourceId(quotaType);
        logRow.setCreatedAt(java.time.LocalDateTime.now());
        try {
            entitlementEventLogMapper.insert(logRow);
        } catch (DuplicateKeyException e) {
            return true;
        }
        return true;
    }

    @Override
    public void invalidateUserCache(Long userId) {
        if (stringRedisTemplate == null) return;
        try {
            if (userId != null) {
                stringRedisTemplate.delete("entitlement:user:" + userId);
            } else {
                // 全量规则变更：仅删前缀需 scan，此处保守 no-op
            }
        } catch (Exception e) {
            log.debug("invalidateUserCache failed userId={}: {}", userId, e.getMessage());
        }
    }

    private EntitlementCheckResult fullAccess(int previewPercent, String body) {
        return EntitlementCheckResult.builder()
                .allowed(true)
                .reason("granted")
                .previewPercent(100)
                .previewBody(body)
                .unlockOptions(List.of())
                .build();
    }

    private EntitlementCheckResult previewWithUnlock(
            Content content, ContentAccessRule rule, int previewPercent,
            String planetId, Long payProductId) {
        List<EntitlementUnlockOption> options = new ArrayList<>();
        options.add(EntitlementUnlockOption.builder()
                .type("member")
                .label("开通会员")
                .actionPath("/pages/member-center/member-center")
                .build());
        if (payProductId != null) {
            options.add(EntitlementUnlockOption.builder()
                    .type("product")
                    .label("单篇解锁")
                    .productId(payProductId)
                    .actionPath("/pages/product-detail/product-detail?id=" + payProductId)
                    .build());
        }
        options.add(EntitlementUnlockOption.builder()
                .type("planet")
                .label("加入星球")
                .planetId(planetId)
                .actionPath("/pages/planet/planet")
                .build());
        if (rule != null && resolveGrants(content, rule).contains("invite")) {
            options.add(EntitlementUnlockOption.builder()
                    .type("invite")
                    .label("邀请好友解锁")
                    .actionPath("/pages/content-detail/content-detail?id=" + content.getId())
                    .build());
        }

        String previewBody = ContentBodyTruncator.truncateHtml(content.getContent(), previewPercent);
        return EntitlementCheckResult.builder()
                .allowed(false)
                .reason("locked")
                .previewPercent(previewPercent)
                .previewBody(previewBody)
                .unlockOptions(options)
                .build();
    }

    private List<String> resolveGrants(Content content, ContentAccessRule rule) {
        if (rule != null && StringUtils.hasText(rule.getGrantsJson())) {
            try {
                List<String> parsed = objectMapper.readValue(
                        rule.getGrantsJson(), new TypeReference<List<String>>() {});
                if (parsed != null && !parsed.isEmpty()) {
                    List<String> clean = new ArrayList<>();
                    for (String g : parsed) {
                        if (g != null && KNOWN_GRANTS.contains(g.trim())) {
                            clean.add(g.trim());
                        }
                    }
                    if (!clean.isEmpty()) {
                        return clean;
                    }
                }
            } catch (Exception e) {
                log.warn("parse grants_json failed contentId={}: {}", content.getId(), e.getMessage());
            }
        }
        List<String> legacy = new ArrayList<>();
        if ("member_only".equalsIgnoreCase(content.getVisibility())) {
            legacy.add("member");
        } else if (Integer.valueOf(1).equals(content.getPlanetExclusive())) {
            legacy.add("planet");
        } else {
            legacy.add("free");
        }
        return legacy;
    }

    private int resolvePreviewPercent(Content content, ContentAccessRule rule) {
        if (content.getPreviewPercent() != null) {
            return content.getPreviewPercent();
        }
        if (rule != null && rule.getPreviewValue() != null) {
            return rule.getPreviewValue();
        }
        return 20;
    }

    /** 供额度周期键 */
    public static String dailyPeriodKey() {
        return LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
    }

    public static String monthlyPeriodKey() {
        return LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
    }
}
