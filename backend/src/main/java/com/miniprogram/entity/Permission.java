package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.miniprogram.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 权限点实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_permission")
@Schema(description = "权限点")
public class Permission extends BaseEntity {

    @Schema(description = "权限编码")
    private String code;

    @Schema(description = "权限名称")
    private String name;

    @Schema(description = "所属模块")
    private String module;

    @Schema(description = "类型 1=菜单 2=按钮 3=接口")
    private Integer type;

    @Schema(description = "父权限ID")
    private Long parentId;

    @Schema(description = "排序")
    private Integer sortOrder;
}
