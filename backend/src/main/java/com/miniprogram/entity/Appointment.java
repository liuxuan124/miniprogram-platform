package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.miniprogram.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

/**
 * 预约记录实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_appointment")
@Schema(description = "预约记录")
public class Appointment extends BaseEntity {

    @Schema(description = "预约单号")
    private String orderNo;

    @Schema(description = "预约用户ID")
    private Long userId;

    @Schema(description = "预约服务ID")
    private Long serviceId;

    @Schema(description = "预约时段ID")
    private Long slotId;

    @Schema(description = "预约日期")
    private LocalDate appointmentDate;

    @Schema(description = "预约时间段 如 09:00-09:30")
    private String appointmentTime;

    @Schema(description = "状态 pending=待确认 confirmed=已确认 cancelled=已取消 completed=已完成 no_show=未到")
    private String status;

    @Schema(description = "联系人姓名")
    private String contactName;

    @Schema(description = "联系人电话")
    private String contactPhone;

    @Schema(description = "备注")
    private String remark;

    @Schema(description = "取消原因")
    private String cancelReason;
}
