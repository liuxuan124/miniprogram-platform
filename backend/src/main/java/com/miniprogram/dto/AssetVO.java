package com.miniprogram.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 素材 VO
 */
@Data
@Schema(description = "素材信息")
public class AssetVO {

    @Schema(description = "主键ID")
    private Long id;

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

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
