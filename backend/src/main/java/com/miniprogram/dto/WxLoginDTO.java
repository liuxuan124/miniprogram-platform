package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 微信小程序登录请求 DTO
 */
@Data
@Schema(description = "微信小程序登录请求")
public class WxLoginDTO {

    @Schema(description = "微信登录凭证 code", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "code不能为空")
    private String code;

    @Schema(description = "用户昵称")
    private String nickname;

    @Schema(description = "用户头像URL")
    private String avatarUrl;

    @Schema(description = "性别 0=未知 1=男 2=女")
    private Integer gender;

    @Schema(description = "来源渠道")
    private String sourceChannel;
}
