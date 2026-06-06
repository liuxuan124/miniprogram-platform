package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.miniprogram.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

/**
 * 预约时段实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_appointment_slot")
@Schema(description = "预约时段")
public class AppointmentSlot extends BaseEntity {

    @Schema(description = "预约服务ID")
    private Long serviceId;

    @Schema(description = "预约日期")
    private LocalDate date;

    @Schema(description = "开始时间 如 09:00")
    private String startTime;

    @Schema(description = "结束时间 如 09:30")
    private String endTime;

    @Schema(description = "最大容量")
    private Integer maxCapacity;

    @Schema(description = "已预约数量")
    private Integer bookedCount;

    @Schema(description = "状态 0=停用 1=启用")
    private Integer status;
}
