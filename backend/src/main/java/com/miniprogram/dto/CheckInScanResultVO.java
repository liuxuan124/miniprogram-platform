package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.Schema;
import lombok.Data;

/**
 * 后台扫码核销结果
 */
@Data
@Schema(description = "扫码核销结果")
public class CheckInScanResultVO {

    @Schema(description = "活动名称")
    private String activityName;

    @Schema(description = "报名人姓名")
    private String signupName;

    @Schema(description = "报名人手机号")
    private String phone;

    @Schema(description = "签到记录ID")
    private Long checkInId;

    @Schema(description = "签到状态: VERIFIED")
    private String status;
}
