package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.Schema;
import lombok.Data;

/**
 * 后台扫码核销请求
 */
@Data
@Schema(description = "扫码核销请求")
public class ScanRequest {

    @Schema(description = "扫码原文或纯签到码")
    private String raw;

    @Schema(description = "期望活动ID；为空则不校验场次")
    private Long activityId;
}
