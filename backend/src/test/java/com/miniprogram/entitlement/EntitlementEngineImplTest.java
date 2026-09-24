package com.miniprogram.entitlement;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.entitlement.dto.EntitlementCheckResult;
import com.miniprogram.entity.Content;
import com.miniprogram.mapper.ContentAccessRuleMapper;
import com.miniprogram.mapper.EntitlementEventLogMapper;
import com.miniprogram.mapper.EntitlementQuotaMapper;
import com.miniprogram.mapper.FileItemMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.service.InviteContentUnlockService;
import com.miniprogram.service.MembershipAccessService;
import com.miniprogram.service.PurchaseEntitlementService;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EntitlementEngineImplTest {

    @Mock
    private ContentAccessRuleMapper contentAccessRuleMapper;
    @Mock
    private MembershipAccessService membershipAccessService;
    @Mock
    private PurchaseEntitlementService purchaseEntitlementService;
    @Mock
    private ProductMapper productMapper;
    @Mock
    private FileItemMapper fileItemMapper;
    @Mock
    private EntitlementEventLogMapper entitlementEventLogMapper;
    @Mock
    private EntitlementQuotaMapper entitlementQuotaMapper;
    @Mock
    private InviteContentUnlockService inviteContentUnlockService;
    @Mock
    private StringRedisTemplate stringRedisTemplate;

    private EntitlementEngineImpl engine;

    @BeforeEach
    void setUp() {
        engine = new EntitlementEngineImpl(
                contentAccessRuleMapper,
                membershipAccessService,
                purchaseEntitlementService,
                productMapper,
                fileItemMapper,
                entitlementEventLogMapper,
                entitlementQuotaMapper,
                inviteContentUnlockService,
                stringRedisTemplate,
                new ObjectMapper());
    }

    @Test
    void publicLegacyContentAllowsAnonymous() {
        Content c = new Content();
        c.setId(1L);
        c.setVisibility("public");
        c.setContent("<p>全文</p>");
        when(contentAccessRuleMapper.selectOne(any())).thenReturn(null);

        EntitlementCheckResult r = engine.checkContentAccess(null, c);
        assertTrue(r.isAllowed());
    }

    @Test
    void memberOnlyBlocksGuest() {
        Content c = new Content();
        c.setId(2L);
        c.setVisibility("member_only");
        c.setContent("<p>secret</p>");
        when(contentAccessRuleMapper.selectOne(any())).thenReturn(null);

        EntitlementCheckResult r = engine.checkContentAccess(null, c);
        assertFalse(r.isAllowed());
    }

    @Test
    void memberOnlyAllowsPlatformMember() {
        Content c = new Content();
        c.setId(3L);
        c.setVisibility("member_only");
        c.setContent("<p>secret</p>");
        when(contentAccessRuleMapper.selectOne(any())).thenReturn(null);
        when(membershipAccessService.hasPlatformMembership(eq(9L))).thenReturn(true);

        EntitlementCheckResult r = engine.checkContentAccess(9L, c);
        assertTrue(r.isAllowed());
    }
}
