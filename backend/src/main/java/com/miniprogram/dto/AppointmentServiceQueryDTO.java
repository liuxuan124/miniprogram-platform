package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 预约服务查询 DTO
 */
@Data
@Schema(description = "预约服务查询参数")
public class AppointmentServiceQueryDTO extends PageDTO {

    @Schema(description = "服务名称关键词")
    private String keyword;

    @Schema(description = "状态 0=停用 1=启用")
    private Integer status;
}
