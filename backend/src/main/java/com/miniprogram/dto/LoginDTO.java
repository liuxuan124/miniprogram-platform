package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 管理员登录请求 DTO
 */
@Data
@Schema(description = "管理员登录请求")
public class LoginDTO {

    @Schema(description = "用户名", example = "admin")
    @NotBlank(message = "用户名不能为空")
    private String username;

    @Schema(description = "密码", example = "admin123")
    @NotBlank(message = "密码不能为空")
    private String password;
}
