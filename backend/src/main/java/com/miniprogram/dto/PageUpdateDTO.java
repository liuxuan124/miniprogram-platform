package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;
import org.springframework.util.StringUtils;

/**
 * 页面更新 DTO（所有字段可选，但至少需要一个有效字段）
 */
@Data
@Schema(description = "页面更新参数")
public class PageUpdateDTO {

    @Size(max = 128, message = "页面名称不能超过 128 个字符")
    @Schema(description = "页面名称")
    private String name;

    @Min(value = 1, message = "页面类型必须为 1/2/3")
    @Max(value = 3, message = "页面类型必须为 1/2/3")
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

    public boolean isEmpty() {
        return !StringUtils.hasText(name)
                && type == null
                && !StringUtils.hasText(path)
                && shareTitle == null
                && shareImage == null
                && description == null;
    }
}
