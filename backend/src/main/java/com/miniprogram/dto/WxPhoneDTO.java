package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 微信获取手机号请求 DTO
 */
@Data
@Schema(description = "微信获取手机号请求")
public class WxPhoneDTO {

    @Schema(description = "微信手机号凭证 code", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "手机号code不能为空")
    private String code;
}
