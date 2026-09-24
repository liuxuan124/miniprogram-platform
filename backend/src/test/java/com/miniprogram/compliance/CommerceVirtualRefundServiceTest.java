package com.miniprogram.compliance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.service.SystemConfigService;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CommerceVirtualRefundServiceTest {

    @Test
    void consentClauseVersion_readsFromConfig() {
        SystemConfigService cfg = mock(SystemConfigService.class);
        when(cfg.getConfigValue(CommerceVirtualRefundService.CONFIG_KEY)).thenReturn(
                "{\"consentClauseVersion\":\"v1-test\",\"byProductType\":{\"ebook\":{\"label\":\"7天内未阅读可退\"}}}");
        CommerceVirtualRefundService svc = new CommerceVirtualRefundService(cfg, new ObjectMapper());
        assertEquals("v1-test", svc.consentClauseVersion());
        assertEquals("7天内未阅读可退", svc.labelForProductType("ebook"));
    }
}
