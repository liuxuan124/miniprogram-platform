package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 素材分组 VO
 */
@Data
@Schema(description = "素材分组信息")
public class AssetGroupVO {

    @Schema(description = "主键ID")
    private Long id;

    @Schema(description = "分组名称")
    private String name;

    @Schema(description = "排序序号")
    private Integer sortOrder;
}
