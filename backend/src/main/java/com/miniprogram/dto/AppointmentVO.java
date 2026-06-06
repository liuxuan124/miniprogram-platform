package com.miniprogram.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 预约记录 VO
 */
@Data
@Schema(description = "预约记录详情")
public class AppointmentVO {

    @Schema(description = "预约ID")
    private Long id;

    @Schema(description = "预约单号")
    private String orderNo;

    @Schema(description = "预约用户ID")
    private Long userId;

    @Schema(description = "预约服务ID")
    private Long serviceId;

    @Schema(description = "服务名称")
    private String serviceName;

    @Schema(description = "预约时段ID")
    private Long slotId;

    @Schema(description = "预约日期")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate appointmentDate;

    @Schema(description = "预约时间段")
    private String appointmentTime;

    @Schema(description = "状态")
    private String status;

    @Schema(description = "状态描述")
    private String statusDesc;

    @Schema(description = "联系人姓名")
    private String contactName;

    @Schema(description = "联系人电话")
    private String contactPhone;

    @Schema(description = "备注")
    private String remark;

    @Schema(description = "取消原因")
    private String cancelReason;

    @Schema(description = "服务价格")
    private BigDecimal servicePrice;

    @Schema(description = "服务时长（分钟）")
    private Integer serviceDuration;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;

    @Schema(description = "更新时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updateTime;

    public static String getStatusDesc(String status) {
        if (status == null) return "";
        return switch (status) {
            case "pending" -> "待确认";
            case "confirmed" -> "已确认";
            case "cancelled" -> "已取消";
            case "completed" -> "已完成";
            case "no_show" -> "未到";
            default -> "未知";
        };
    }
}
