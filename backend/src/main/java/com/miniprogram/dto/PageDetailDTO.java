package com.miniprogram.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 页面详情 DTO
 */
@Data
@Schema(description = "页面详情信息")
public class PageDetailDTO {

    @Schema(description = "页面ID")
    private Long id;

    @Schema(description = "页面名称")
    private String name;

    @Schema(description = "页面类型 1=首页 2=专题页 3=自定义页")
    private Integer type;

    @Schema(description = "页面类型描述")
    private String typeDesc;

    @Schema(description = "小程序访问路径")
    private String path;

    @Schema(description = "分享标题")
    private String shareTitle;

    @Schema(description = "分享封面图URL")
    private String shareImage;

    @Schema(description = "状态 0=草稿 1=已发布 2=已下架")
    private Integer status;

    @Schema(description = "状态描述")
    private String statusDesc;

    @Schema(description = "当前发布版本号")
    private Integer currentVersion;

    @Schema(description = "页面描述")
    private String description;

    @Schema(description = "当前草稿DSL内容")
    private String draftDslContent;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;

    @Schema(description = "更新时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updateTime;

    public static String getTypeDesc(Integer type) {
        if (type == null) return "";
        return switch (type) {
            case 1 -> "首页";
            case 2 -> "专题页";
            case 3 -> "自定义页";
            default -> "未知";
        };
    }

    public static String getStatusDesc(Integer status) {
        if (status == null) return "";
        return switch (status) {
            case 0 -> "草稿";
            case 1 -> "已发布";
            case 2 -> "已下架";
            default -> "未知";
        };
    }
}
