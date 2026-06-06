package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 角色权限设置 DTO
 */
@Data
@Schema(description = "角色权限设置请求")
public class RolePermissionDTO {

    @Schema(description = "权限ID列表")
    private List<Long> permissionIds;
}
