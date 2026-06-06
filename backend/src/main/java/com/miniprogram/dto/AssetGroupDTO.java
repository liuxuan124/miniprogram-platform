package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 素材分组 DTO
 */
@Data
@Schema(description = "素材分组参数")
public class AssetGroupDTO {

    @Schema(description = "分组名称")
    private String name;

    @Schema(description = "排序序号")
    private Integer sortOrder;
}
