package com.miniprogram.dto.member;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "优惠券查询DTO")
public class CouponQueryDTO {

    @Schema(description = "状态: draft/published/disabled")
    private String status;

    @Schema(description = "页码")
    private Integer page = 1;

    @Schema(description = "每页数量")
    private Integer size = 20;
}
