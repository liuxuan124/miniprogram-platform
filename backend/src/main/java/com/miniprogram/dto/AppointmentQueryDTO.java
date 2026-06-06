package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 预约查询 DTO
 */
@Data
@Schema(description = "预约查询参数")
public class AppointmentQueryDTO extends PageDTO {

    @Schema(description = "预约状态 pending/confirmed/cancelled/completed/no_show")
    private String status;

    @Schema(description = "预约服务ID")
    private Long serviceId;

    @Schema(description = "联系人姓名关键词")
    private String contactName;

    @Schema(description = "预约日期")
    private String appointmentDate;
}
