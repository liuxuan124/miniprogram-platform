package com.miniprogram.dto.member;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "积分日志VO")
public class PointsLogVO {

    @Schema(description = "ID")
    private Long id;

    @Schema(description = "用户ID")
    private Long userId;

    @Schema(description = "积分变动值")
    private Integer points;

    @Schema(description = "类型")
    private String type;

    @Schema(description = "描述")
    private String description;

    @Schema(description = "创建时间")
    private String createdAt;
}
