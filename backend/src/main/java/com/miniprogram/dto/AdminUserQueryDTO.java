package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

/**
 * 管理员列表查询 DTO
 */
@Data
@Schema(description = "管理员列表查询参数")
public class AdminUserQueryDTO extends PageDTO {

    @Schema(description = "用户名（模糊查询）")
    private String username;

    @Schema(description = "真实姓名（模糊查询）")
    private String realName;

    @Schema(description = "手机号")
    private String phone;

    @Schema(description = "角色ID")
    private Long roleId;

    @Schema(description = "状态 1=启用 0=禁用")
    private Integer status;
}
