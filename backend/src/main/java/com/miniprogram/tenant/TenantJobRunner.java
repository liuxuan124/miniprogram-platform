package com.miniprogram.tenant;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.entity.Tenant;
import com.miniprogram.mapper.TenantMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.function.LongConsumer;

/**
 * 定时任务按租户枚举执行，避免仅处理默认租户。
 */
@Component
@RequiredArgsConstructor
public class TenantJobRunner {

    private final TenantMapper tenantMapper;

    public void forEachActiveTenant(LongConsumer task) {
        List<Tenant> tenants = tenantMapper.selectList(new LambdaQueryWrapper<Tenant>()
                .eq(Tenant::getStatus, 1));
        if (tenants == null || tenants.isEmpty()) {
            runWithTenant(TenantContext.DEFAULT_TENANT_ID, task);
            return;
        }
        for (Tenant tenant : tenants) {
            Long id = tenant.getId() != null ? tenant.getId() : TenantContext.DEFAULT_TENANT_ID;
            runWithTenant(id, task);
        }
    }

    private void runWithTenant(Long tenantId, LongConsumer task) {
        try {
            TenantContext.setTenantId(tenantId);
            task.accept(tenantId);
        } finally {
            TenantContext.clear();
        }
    }
}
