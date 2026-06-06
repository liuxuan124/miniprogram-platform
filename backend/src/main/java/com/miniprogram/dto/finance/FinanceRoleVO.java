package com.miniprogram.dto.finance;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

/**
 * 财务角色 VO
 */
@Data
@Schema(description = "财务角色VO")
public class FinanceRoleVO {

    @Schema(description = "ID")
    private Long id;

    @Schema(description = "角色名称")
    private String name;

    @Schema(description = "权限级别: viewer/editor/approver/admin")
    private String level;

    @Schema(description = "描述")
    private String description;

    @Schema(description = "权限列表")
    private List<String> permissions;

    @Schema(description = "成员数量")
    private Integer memberCount;

    @Schema(description = "创建时间")
    private String createdAt;
}
