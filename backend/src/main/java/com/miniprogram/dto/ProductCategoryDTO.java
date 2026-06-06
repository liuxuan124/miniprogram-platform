package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 商品分类创建/更新 DTO
 */
@Data
@Schema(description = "商品分类创建/更新参数")
public class ProductCategoryDTO {

    @NotBlank(message = "分类名称不能为空")
    @Schema(description = "分类名称")
    private String name;

    @Schema(description = "父分类ID, 0为顶级")
    private Long parentId = 0L;

    @Schema(description = "排序")
    private Integer sortOrder = 0;

    @Schema(description = "分类图标URL")
    private String icon;

    @Schema(description = "状态: 1=启用, 0=禁用")
    private Integer status = 1;
}
