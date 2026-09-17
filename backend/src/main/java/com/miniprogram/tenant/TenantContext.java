package com.miniprogram.tenant;

/**
 * 请求级租户上下文（ThreadLocal）
 */
public final class TenantContext {

    public static final long DEFAULT_TENANT_ID = 1L;

    private static final ThreadLocal<Long> TENANT_ID = new ThreadLocal<>();

    private TenantContext() {
    }

    public static void setTenantId(Long tenantId) {
        if (tenantId == null || tenantId <= 0) {
            TENANT_ID.set(DEFAULT_TENANT_ID);
        } else {
            TENANT_ID.set(tenantId);
        }
    }

    public static Long getTenantId() {
        Long id = TENANT_ID.get();
        return id == null ? DEFAULT_TENANT_ID : id;
    }

    public static Long getTenantIdOrNull() {
        return TENANT_ID.get();
    }

    public static void clear() {
        TENANT_ID.remove();
    }
}
