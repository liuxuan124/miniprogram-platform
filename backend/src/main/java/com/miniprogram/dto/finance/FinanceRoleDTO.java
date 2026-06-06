package com.miniprogram.dto.finance;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/**
 * 财务角色 DTO
 */
@Data
@Schema(description = "财务角色DTO")
public class FinanceRoleDTO {

    @Schema(description = "角色名称")
    @NotBlank(message = "角色名称不能为空")
    private String name;

    @Schema(description = "权限级别: viewer/editor/approver/admin")
    @NotBlank(message = "权限级别不能为空")
    private String level;

    @Schema(description = "描述")
    private String description;

    @Schema(description = "权限列表")
    private List<String> permissions;
}
