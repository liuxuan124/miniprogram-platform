package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 取消预约 DTO
 */
@Data
@Schema(description = "取消预约参数")
public class AppointmentCancelDTO {

    @Schema(description = "取消原因")
    private String cancelReason;
}
