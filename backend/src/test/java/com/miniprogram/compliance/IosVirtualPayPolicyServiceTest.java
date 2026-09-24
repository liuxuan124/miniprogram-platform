package com.miniprogram.compliance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.entity.Product;
import com.miniprogram.service.SystemConfigService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class IosVirtualPayPolicyServiceTest {

    @Test
    void blocksVirtualOnIos() {
        SystemConfigService cfg = mock(SystemConfigService.class);
        when(cfg.getConfigValue(eq("commerce_ios_virtual_pay"))).thenReturn(null);
        ComplianceAuditService audit = mock(ComplianceAuditService.class);
        IosVirtualPayPolicyService svc = new IosVirtualPayPolicyService(cfg, audit, new ObjectMapper());

        Product p = new Product();
        p.setId(1L);
        p.setProductType("ebook");
        var gate = svc.evaluateProduct("ios", p);
        assertFalse(gate.canPurchase());
        assertTrue(gate.virtualGoods());

        assertThrows(BusinessException.class, () -> svc.assertCanCreateOrder(9L, "ios", List.of(p)));
    }

    @Test
    void allowsVirtualOnAndroid() {
        SystemConfigService cfg = mock(SystemConfigService.class);
        when(cfg.getConfigValue(eq("commerce_ios_virtual_pay"))).thenReturn(null);
        ComplianceAuditService audit = mock(ComplianceAuditService.class);
        IosVirtualPayPolicyService svc = new IosVirtualPayPolicyService(cfg, audit, new ObjectMapper());

        Product p = new Product();
        p.setProductType("membership");
        var gate = svc.evaluateProduct("android", p);
        assertTrue(gate.canPurchase());
    }
}
