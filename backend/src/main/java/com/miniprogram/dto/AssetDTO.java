package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 素材 DTO
 */
@Data
@Schema(description = "素材参数")
public class AssetDTO {

    @Schema(description = "素材名称")
    private String name;

    @Schema(description = "素材类型: image/video")
    private String type;

    @Schema(description = "素材URL")
    private String url;

    @Schema(description = "缩略图URL")
    private String thumbUrl;

    @Schema(description = "文件大小(字节)")
    private Long size;

    @Schema(description = "所属分组ID")
    private Long groupId;
}
