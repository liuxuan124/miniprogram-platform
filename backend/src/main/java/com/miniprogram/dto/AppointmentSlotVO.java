package com.miniprogram.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 预约时段 VO
 */
@Data
@Schema(description = "预约时段详情")
public class AppointmentSlotVO {

    @Schema(description = "时段ID")
    private Long id;

    @Schema(description = "预约服务ID")
    private Long serviceId;

    @Schema(description = "预约日期")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;

    @Schema(description = "开始时间")
    private String startTime;

    @Schema(description = "结束时间")
    private String endTime;

    @Schema(description = "最大容量")
    private Integer maxCapacity;

    @Schema(description = "已预约数量")
    private Integer bookedCount;

    @Schema(description = "剩余容量")
    private Integer remainingCapacity;

    @Schema(description = "状态 0=停用 1=启用")
    private Integer status;

    @Schema(description = "状态描述")
    private String statusDesc;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;

    public static String getStatusDesc(Integer status) {
        if (status == null) return "";
        return switch (status) {
            case 0 -> "停用";
            case 1 -> "启用";
            default -> "未知";
        };
    }
}
