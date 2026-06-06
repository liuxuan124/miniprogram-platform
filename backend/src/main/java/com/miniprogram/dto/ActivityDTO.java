package com.miniprogram.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 活动 DTO
 */
@Data
@Schema(description = "活动参数")
public class ActivityDTO {

    @Schema(description = "活动名称")
    private String name;

    @Schema(description = "活动类型")
    private String type;

    @Schema(description = "活动日期")
    private LocalDate date;

    @Schema(description = "活动地点")
    private String venue;

    @Schema(description = "名额上限")
    private Integer quota;

    @Schema(description = "封面图URL")
    private String cover;

    @Schema(description = "活动描述")
    private String description;
}
