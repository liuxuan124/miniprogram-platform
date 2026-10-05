package com.miniprogram.job;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 公众号同步任务「无凭证就跳过」的判定单测。
 *
 * <p>背景：2026-10-05 生产 {@code wx_oa_appid=admin}、{@code wx_oa_app_secret=admin@12356}，
 * 任务无守卫照跑，每 2 小时报一次 invalid appid，3 天 72 次 WARN。修复后无凭证直接跳过。
 *
 * <p>{@code isWechatAppId} / {@code isWechatSecret} 是 private 非静态，
 * 用反射 + {@code new} 造实例（Job 只有一个 {@code @RequiredArgsConstructor} 构造器，
 * 反射传 null 即可，不需要真的依赖）。
 */
class WeChatSyncJobCredentialGuardTest {

    private static final String REAL_APPID = "wxea3928e0978492fe";
    private static final String REAL_SECRET = "ba9e9137da56c17b5feb078dfde348f8";

    private boolean invoke(String method, String arg) throws Exception {
        WeChatOfficialAccountSyncJob job = new WeChatOfficialAccountSyncJob(null, null, null);
        Method m = WeChatOfficialAccountSyncJob.class.getDeclaredMethod(method, String.class);
        m.setAccessible(true);
        return (Boolean) m.invoke(job, arg);
    }

    @Test
    @DisplayName("生产实际值 admin / admin@12356 必须判为不可用")
    void productionPlaceholdersRejected() throws Exception {
        assertFalse(invoke("isWechatAppId", "admin"), "wx_oa_appid=admin 必须不可用");
        assertFalse(invoke("isWechatAppId", "  ADMIN "), "大小写+空格变体也要拦");
        assertFalse(invoke("isWechatSecret", "admin@12356"), "admin@12356 长度够但仍是占位符");
        assertFalse(invoke("isWechatSecret", "changeme"), "changeme 是占位符");
        assertFalse(invoke("isWechatAppId", null));
        assertFalse(invoke("isWechatSecret", null));
        assertFalse(invoke("isWechatSecret", "   "));
    }

    @Test
    @DisplayName("真实凭证必须被接受")
    void realCredentialAccepted() throws Exception {
        assertTrue(invoke("isWechatAppId", REAL_APPID));
        assertTrue(invoke("isWechatAppId", "  " + REAL_APPID + "  "), "前后空格应容忍");
        assertTrue(invoke("isWechatSecret", REAL_SECRET));
    }

    @Test
    @DisplayName("AppId 格式：wx + 16 位十六进制")
    void appidFormat() throws Exception {
        assertFalse(invoke("isWechatAppId", "wx123"));
        assertFalse(invoke("isWechatAppId", "abcdefabcdefabcdef"));
        assertFalse(invoke("isWechatAppId", "wxea3928e0978492f"), "15 位");
        assertFalse(invoke("isWechatAppId", "wxea3928e0978492feff"), "17 位");
        assertFalse(invoke("isWechatAppId", "wxZZ928e0978492feXY"), "非十六进制");
        assertTrue(invoke("isWechatAppId", "wx0123456789abcdef"));
    }

    /**
     * 顺带固化一个重要事实：公众号与小程序 AppID 不同，
     * 所以「公众号 appid 是占位符时回落到小程序凭证」这条路径在本项目里并不成立
     * （会换成 40125 invalid appsecret）。这条注释避免后人误以为回落能修好。
     */
    @Test
    @DisplayName("记录：公众号凭证缺失时回落小程序凭证并不能真正工作（仅文档价值）")
    void fallbackIsNotASilverBullet() {
        Map<String, String> cfg = new HashMap<>();
        cfg.put("wx_oa_appid", "admin");           // 占位符
        cfg.put("wx_oa_app_secret", "admin@12356");
        cfg.put("wx_appid", REAL_APPID);
        cfg.put("wx_app_secret", REAL_SECRET);
        // 业务侧据此判断：有小程序凭证 → 会「试一下」→ 实际会 40125。
        // 所以真正的解法是 hasUsableCredential()==false 时直接跳过（见 Job 里的守卫）。
        assertTrue(cfg.get("wx_oa_appid").equals("admin"));
        assertTrue(cfg.get("wx_appid").startsWith("wx"));
    }
}
