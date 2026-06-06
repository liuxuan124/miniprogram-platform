package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

/**
 * 素材批量操作 DTO
 */
@Data
@Schema(description = "素材批量操作请求")
public class AssetBatchDTO {

    @NotEmpty(message = "素材ID列表不能为空")
    @Schema(description = "素材ID列表", example = "[1, 2, 3]")
    private List<Long> ids;

    @Schema(description = "目标分组ID（移动时使用）")
    private Long groupId;
}
