package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.miniprogram.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

/**
 * 预约服务实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_appointment_service")
@Schema(description = "预约服务")
public class AppointmentService extends BaseEntity {

    @Schema(description = "服务名称")
    private String name;

    @Schema(description = "服务描述")
    private String description;

    @Schema(description = "服务图片URL")
    private String image;

    @Schema(description = "服务时长（分钟）")
    private Integer duration;

    @Schema(description = "服务价格")
    private BigDecimal price;

    @Schema(description = "状态 0=停用 1=启用")
    private Integer status;
}
