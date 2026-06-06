package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 刷新 Token 请求 DTO
 */
@Data
@Schema(description = "刷新Token请求")
public class RefreshTokenDTO {

    @Schema(description = "刷新令牌")
    @NotBlank(message = "刷新令牌不能为空")
    private String refreshToken;
}
