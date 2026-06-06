package com.miniprogram.dto.member;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "积分日志查询DTO")
public class PointsLogQueryDTO {

    @Schema(description = "用户ID")
    private Long userId;

    @Schema(description = "类型: sign_in/consume/exchange/admin")
    private String type;

    @Schema(description = "页码")
    private Integer page = 1;

    @Schema(description = "每页数量")
    private Integer size = 20;
}
