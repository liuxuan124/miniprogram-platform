package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * V119 绑定手机号结果（新版端上专用）。
 *
 * <p>🔴 <b>为什么不复用老的 {@code POST /api/v1/mp/auth/phone}</b>：
 * 该接口原本返回裸 String，已发布的小程序版本（&lt;= 1.33.x）里
 * {@code login-flow.js} 直接 {@code phone = await AuthService.bindPhone(...)}
 * 再 {@code completeLogin({ phone })} 落进持久化的 userInfo。
 * 一旦改成返回对象，**线上老版本会把整个对象当手机号存下来**（显示成
 * {@code [object Object]}，下单/优惠券等依赖 phone 的功能随之出错），
 * 而老版本要等下一次审核发布才会更新 —— 不能让它们承担这个风险。
 *
 * <p>所以拆成两个端点：
 * <ul>
 *   <li>{@code POST /api/v1/mp/auth/phone} —— 契约<strong>不变</strong>，仍返回 String，
 *       老版本零影响；服务端内部照样做手机号幂等合并（合并信号通过响应头
 *       {@code X-Account-Merged} / {@code X-Account-User-Id} 附带，
 *       老版本会忽略，新版本可读）。</li>
 *   <li>{@code POST /api/v1/mp/auth/phone/v2} —— 本 DTO，供已更新的端上使用，
 *       拿到 {@code merged=true} 后重新 wxLogin 换主账号 token。</li>
 * </ul>
 */
@Data
@Schema(description = "绑定手机号结果（v2，含账号合并信号）")
public class WxPhoneBindVO {

    @Schema(description = "绑定后的手机号")
    private String phone;

    @Schema(description = "本次请求最终归属的账号 id（发生合并时为主账号 id）")
    private Long userId;

    @Schema(description = "是否发生了账号合并：true 表示端上应重新登录以换取主账号 token")
    private Boolean merged = false;
}
