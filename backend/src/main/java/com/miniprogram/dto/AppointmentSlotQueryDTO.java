package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 预约时段查询 DTO
 */
@Data
@Schema(description = "预约时段查询参数")
public class AppointmentSlotQueryDTO extends PageDTO {

    @Schema(description = "预约服务ID")
    private Long serviceId;

    @Schema(description = "预约日期")
    private String date;

    @Schema(description = "状态 0=停用 1=启用")
    private Integer status;
}
