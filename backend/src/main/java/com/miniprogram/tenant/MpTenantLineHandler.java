package com.miniprogram.tenant;

import com.baomidou.mybatisplus.extension.plugins.handler.TenantLineHandler;
import net.sf.jsqlparser.expression.Expression;
import net.sf.jsqlparser.expression.LongValue;

import java.util.Set;

/**
 * MyBatis-Plus 多租户行级隔离（白名单：仅对已迁移 tenant_id 的表生效）
 */
public class MpTenantLineHandler implements TenantLineHandler {

    private static final ThreadLocal<Boolean> IGNORE = ThreadLocal.withInitial(() -> Boolean.FALSE);

    /** P2 隔离范围：配置 / 页面 / 内容 / 商品 / 文件 / 订单；登录表人工过滤 */
    private static final Set<String> TENANT_TABLES = Set.of(
            "mp_content",
            "mp_content_category",
            "mp_content_tag",
            "mp_product",
            "mp_page",
            "mp_system_config",
            "mp_file_item",
            "mp_order"
    );

    public static void runWithoutTenant(Runnable action) {
        IGNORE.set(Boolean.TRUE);
        try {
            action.run();
        } finally {
            IGNORE.set(Boolean.FALSE);
        }
    }

    @Override
    public Expression getTenantId() {
        return new LongValue(TenantContext.getTenantId());
    }

    @Override
    public String getTenantIdColumn() {
        return "tenant_id";
    }

    @Override
    public boolean ignoreTable(String tableName) {
        if (Boolean.TRUE.equals(IGNORE.get())) {
            return true;
        }
        if (tableName == null) {
            return true;
        }
        return !TENANT_TABLES.contains(tableName.toLowerCase());
    }
}
