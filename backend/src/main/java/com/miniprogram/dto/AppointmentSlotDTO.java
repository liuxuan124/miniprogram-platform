package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

/**
 * 预约时段创建/更新 DTO
 */
@Data
@Schema(description = "预约时段创建/更新参数")
public class AppointmentSlotDTO {

    @NotNull(message = "预约服务ID不能为空")
    @Schema(description = "预约服务ID")
    private Long serviceId;

    @NotNull(message = "预约日期不能为空")
    @Schema(description = "预约日期")
    private LocalDate date;

    @Schema(description = "开始时间 如 09:00")
    private String startTime;

    @Schema(description = "结束时间 如 09:30")
    private String endTime;

    @Schema(description = "最大容量")
    private Integer maxCapacity;

    @Schema(description = "状态 0=停用 1=启用")
    private Integer status;
}
