package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 页面创建/更新 DTO
 */
@Data
@Schema(description = "页面创建/更新参数")
public class PageCreateDTO {

    @NotBlank(message = "页面名称不能为空")
    @Schema(description = "页面名称", example = "首页")
    private String name;

    @NotNull(message = "页面类型不能为空")
    @Schema(description = "页面类型 1=首页 2=专题页 3=自定义页", example = "1")
    private Integer type;

    @NotBlank(message = "页面路径不能为空")
    @Schema(description = "小程序访问路径", example = "pages/index/index")
    private String path;

    @Schema(description = "分享标题")
    private String shareTitle;

    @Schema(description = "分享封面图URL")
    private String shareImage;

    @Schema(description = "页面描述")
    private String description;
}
