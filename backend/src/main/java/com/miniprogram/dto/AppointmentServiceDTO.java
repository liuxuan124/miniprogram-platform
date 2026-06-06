package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 预约服务创建/更新 DTO
 */
@Data
@Schema(description = "预约服务创建/更新参数")
public class AppointmentServiceDTO {

    @NotBlank(message = "服务名称不能为空")
    @Schema(description = "服务名称")
    private String name;

    @Schema(description = "服务描述")
    private String description;

    @Schema(description = "服务图片URL")
    private String image;

    @NotNull(message = "服务时长不能为空")
    @Schema(description = "服务时长（分钟）")
    private Integer duration;

    @Schema(description = "服务价格")
    private BigDecimal price;

    @Schema(description = "状态 0=停用 1=启用")
    private Integer status;
}
