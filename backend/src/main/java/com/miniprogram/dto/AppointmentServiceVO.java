package com.miniprogram.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 预约服务 VO
 */
@Data
@Schema(description = "预约服务详情")
public class AppointmentServiceVO {

    @Schema(description = "服务ID")
    private Long id;

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

    @Schema(description = "状态描述")
    private String statusDesc;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;

    @Schema(description = "更新时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updateTime;

    public static String getStatusDesc(Integer status) {
        if (status == null) return "";
        return switch (status) {
            case 0 -> "停用";
            case 1 -> "启用";
            default -> "未知";
        };
    }
}
