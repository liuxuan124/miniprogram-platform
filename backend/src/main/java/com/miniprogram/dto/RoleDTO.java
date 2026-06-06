package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 角色创建/更新 DTO
 */
@Data
@Schema(description = "角色创建/更新请求")
public class RoleDTO {

    @Schema(description = "角色编码")
    @NotBlank(message = "角色编码不能为空")
    @Size(max = 64, message = "角色编码最长64个字符")
    private String code;

    @Schema(description = "角色名称")
    @NotBlank(message = "角色名称不能为空")
    @Size(max = 64, message = "角色名称最长64个字符")
    private String name;

    @Schema(description = "角色描述")
    @Size(max = 255, message = "角色描述最长255个字符")
    private String description;

    @Schema(description = "状态 1=启用 0=禁用")
    private Integer status;
}
