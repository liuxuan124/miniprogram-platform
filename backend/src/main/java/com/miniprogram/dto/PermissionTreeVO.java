package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 权限树节点 VO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "权限树节点")
public class PermissionTreeVO {

    @Schema(description = "权限ID")
    private Long id;

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

    @Schema(description = "子权限列表")
    private List<PermissionTreeVO> children;
}
