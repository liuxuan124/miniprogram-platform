package com.miniprogram.dto.member;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "签到结果VO")
public class SignInVO {

    @Schema(description = "获得积分")
    private Integer earnedPoints;

    @Schema(description = "连续签到天数")
    private Integer continuousSignDays;

    @Schema(description = "当前总积分")
    private Integer totalPoints;
}
