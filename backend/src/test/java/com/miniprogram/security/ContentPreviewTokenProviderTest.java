package com.miniprogram.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class ContentPreviewTokenProviderTest {

    private ContentPreviewTokenProvider provider;

    @BeforeEach
    void setUp() {
        provider = new ContentPreviewTokenProvider();
        ReflectionTestUtils.setField(provider, "previewSecret",
                "miniprogram-preview-token-test-key-32chars-min");
        ReflectionTestUtils.setField(provider, "expirationMs", 7200000L);
    }

    @Test
    void issueAndParse() {
        ContentPreviewTokenProvider.IssuedToken issued = provider.issue(1L, 42L);
        assertNotNull(issued.token());
        assertEquals(ContentPreviewTokenProvider.InspectStatus.VALID, provider.inspect(issued.token()));
        ContentPreviewTokenProvider.ParsedPreview parsed = provider.parse(issued.token());
        assertEquals(1L, parsed.tenantId());
        assertEquals(42L, parsed.operatorId());
        assertEquals(ContentPreviewTokenProvider.SCOPE_DRAFT_READ, parsed.scope());
        assertNotNull(parsed.jti());
    }
}
