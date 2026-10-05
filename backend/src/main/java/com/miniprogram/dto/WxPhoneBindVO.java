package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * V119 绑定手机号结果。
 *
 * <p>之所以不继续用裸 String：本方法内部可能把「刚建的空壳账号」并入「该手机号已存在的账号」。
 * 合并后客户端手里那张 token 属于已被软删的空壳账号，继续用会一路 401。
 * 因此额外回传 merged / userId，由端上判断是否需要重新 wxLogin 换一张 token。
 */
@Data
@Schema(description = "绑定手机号结果")
public class WxPhoneBindVO {

    @Schema(description = "绑定后的手机号")
    private String phone;

    @Schema(description = "本次请求最终归属的账号 id（发生合并时为主账号 id）")
    private Long userId;

    @Schema(description = "是否发生了账号合并：true 表示端上应重新登录以换取主账号 token")
    private Boolean merged = false;
}
