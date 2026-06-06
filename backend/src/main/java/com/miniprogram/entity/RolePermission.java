package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.miniprogram.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 角色权限关联实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_role_permission")
@Schema(description = "角色权限关联")
public class RolePermission extends BaseEntity {

    @Schema(description = "角色ID")
    private Long roleId;

    @Schema(description = "权限ID")
    private Long permissionId;
}
