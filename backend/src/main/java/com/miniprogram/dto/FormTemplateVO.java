package com.miniprogram.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 表单模板详情 VO
 */
@Data
@Schema(description = "表单模板详情")
public class FormTemplateVO {

    @Schema(description = "表单模板ID")
    private Long id;

    @Schema(description = "表单名称")
    private String name;

    @Schema(description = "表单描述")
    private String description;

    @Schema(description = "表单字段定义JSON")
    private String fields;

    @Schema(description = "状态 0=停用 1=启用")
    private Integer status;

    @Schema(description = "状态描述")
    private String statusDesc;

    @Schema(description = "提交次数")
    private Integer submitCount;

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
