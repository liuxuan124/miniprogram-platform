package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 页面更新 DTO（所有字段可选）
 */
@Data
@Schema(description = "页面更新参数")
public class PageUpdateDTO {

    @Schema(description = "页面名称")
    private String name;

    @Schema(description = "页面类型 1=首页 2=专题页 3=自定义页")
    private Integer type;

    @Schema(description = "小程序访问路径")
    private String path;

    @Schema(description = "分享标题")
    private String shareTitle;

    @Schema(description = "分享封面图URL")
    private String shareImage;

    @Schema(description = "页面描述")
    private String description;
}
