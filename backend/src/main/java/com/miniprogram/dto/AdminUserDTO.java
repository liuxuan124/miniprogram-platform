package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 管理员创建/更新 DTO
 */
@Data
@Schema(description = "管理员创建/更新请求")
public class AdminUserDTO {

    @Schema(description = "登录账号")
    @NotBlank(message = "登录账号不能为空")
    @Size(max = 64, message = "登录账号最长64个字符")
    private String username;

    @Schema(description = "密码（创建时必填，更新时为空则不修改）")
    @Size(min = 6, max = 32, message = "密码长度6-32个字符")
    private String password;

    @Schema(description = "真实姓名")
    @Size(max = 64, message = "真实姓名最长64个字符")
    private String realName;

    @Schema(description = "手机号")
    @Size(max = 20, message = "手机号最长20个字符")
    private String phone;

    @Schema(description = "头像地址")
    private String avatarUrl;

    @Schema(description = "关联角色ID")
    private Long roleId;

    @Schema(description = "状态 1=启用 0=禁用")
    private Integer status;
}
