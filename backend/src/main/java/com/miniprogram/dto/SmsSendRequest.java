package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 小程序发送短信验证码请求。
 */
@Data
@Schema(description = "发送短信验证码请求")
public class SmsSendRequest {

    @Schema(description = "手机号", requiredMode = Schema.RequiredMode.REQUIRED, example = "13800138000")
    @NotBlank(message = "手机号不能为空")
    private String phone;

    @Schema(description = "场景码，仅 activity_signup", requiredMode = Schema.RequiredMode.REQUIRED, example = "activity_signup")
    @NotBlank(message = "场景不能为空")
    private String scene;
}
