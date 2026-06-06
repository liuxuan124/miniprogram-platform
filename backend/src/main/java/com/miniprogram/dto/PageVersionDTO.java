package com.miniprogram.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 页面版本 DTO
 */
@Data
@Schema(description = "页面版本信息")
public class PageVersionDTO {

    @Schema(description = "版本ID")
    private Long id;

    @Schema(description = "页面ID")
    private Long pageId;

    @Schema(description = "版本号")
    private Integer version;

    @Schema(description = "DSL内容")
    private String dslContent;

    @Schema(description = "状态 0=草稿 1=已发布 2=已回滚")
    private Integer status;

    @Schema(description = "状态描述")
    private String statusDesc;

    @Schema(description = "发布时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime publishedAt;

    @Schema(description = "发布人ID")
    private Long publisherId;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;

    public static String getStatusDesc(Integer status) {
        if (status == null) return "";
        return switch (status) {
            case 0 -> "草稿";
            case 1 -> "已发布";
            case 2 -> "已回滚";
            default -> "未知";
        };
    }
}
