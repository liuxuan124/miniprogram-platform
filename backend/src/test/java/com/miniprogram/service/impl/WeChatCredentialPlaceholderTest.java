package com.miniprogram.service.impl;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 凭证占位符识别单测。
 *
 * <p>背景：2026-10-05 生产事故 —— {@code wx_oa_appid} 被填成 {@code admin}、
 * {@code wx_oa_app_secret} 填成 {@code admin@12356}，原实现只判 {@code StringUtils.hasText}，
 * 非空即通过 → 永远回落不到正确的小程序凭证 → 每 2 小时报一次 {@code errcode 40013}，
 * 静默失效 3 天。修复后占位符会被识别并视为「未配置」。
 *
 * <p>被测方法是 private，用反射调；这样测的是**真实生产代码**，不是复制一份逻辑。
 */
class WeChatCredentialPlaceholderTest {

    private static final String REAL_MINIAPP_APPID = "wxea3928e0978492fe";

    /** 反射拿到 private static 的占位符表，避免测试里再抄一份（抄的那份会漂移）。 */
    private static List<String> placeholders() throws Exception {
        java.lang.reflect.Field f = WeChatOfficialAccountClientImpl.class
                .getDeclaredField("PLACEHOLDER_VALUES");
        f.setAccessible(true);
        @SuppressWarnings("unchecked")
        List<String> v = (List<String>) f.get(null);
        return v;
    }

    private boolean usable(String value, String kind) throws Exception {
        Method m = WeChatOfficialAccountClientImpl.class
                .getDeclaredMethod("isUsableCredential", String.class, String.class);
        m.setAccessible(true);
        return (Boolean) m.invoke(null, value, kind);
    }

    @Test
    @DisplayName("生产实际踩到的两个占位符必须被识别为不可用")
    void productionPlaceholdersRejected() throws Exception {
        // 这两个值就是生产 mp_system_config 里真实存在的
        assertFalse(usable("admin", "appid"), "wx_oa_appid=admin 必须判为不可用");
        assertFalse(usable("admin@12356", "secret"), "wx_oa_app_secret=admin@12356 必须判为不可用");
        // 大小写与空格也要拦住
        assertFalse(usable("  ADMIN  ", "appid"), "大小写+空格变体也要拦住");
        assertFalse(usable("Admin", "secret"), "secret 同样要大小写不敏感");
    }

    @Test
    @DisplayName("真实小程序凭证必须被接受，且不会被误杀")
    void realCredentialAccepted() throws Exception {
        assertTrue(usable(REAL_MINIAPP_APPID, "appid"), "真实小程序 appid 必须可用");
        assertTrue(usable("ba9e9137da56c17b5feb078dfde348", "secret"), "32 位 secret 必须可用");
        assertTrue(usable("  " + REAL_MINIAPP_APPID + "  ", "appid"), "前后空格应容忍");
    }

    @Test
    @DisplayName("AppID 必须符合 wx + 16 位十六进制，否则微信一定拒绝")
    void appidFormatEnforced() throws Exception {
        assertFalse(usable("wx123", "appid"), "长度不足");
        assertFalse(usable("abcdefabcdefabcdef", "appid"), "不以 wx 开头");
        assertFalse(usable("wxea3928e0978492f", "appid"), "15 位（少一位）");
        assertFalse(usable("wxea3928e0978492feff", "appid"), "17 位（多一位）");
        assertFalse(usable("wxZZ928e0978492feXY", "appid"), "非十六进制字符");
        assertTrue(usable("wx0123456789abcdef", "appid"), "全数字+abcdef 应通过");
    }

    @Test
    @DisplayName("空值 / null 一律不可用")
    void emptyRejected() throws Exception {
        assertFalse(usable(null, "appid"));
        assertFalse(usable("", "appid"));
        assertFalse(usable("   ", "secret"));
    }

    @Test
    @DisplayName("占位符表本身不含真实凭证形态的值（防误伤）")
    void placeholderTableSane() throws Exception {
        List<String> ph = placeholders();
        assertFalse(ph.isEmpty(), "占位符表不该是空的");
        for (String p : ph) {
            assertFalse(p.equals(REAL_MINIAPP_APPID), "占位符表里混入了真实 appid: " + p);
            assertTrue(p.equals(p.toLowerCase()), "占位符应统一小写（比较时用小写）: " + p);
        }
    }
}
