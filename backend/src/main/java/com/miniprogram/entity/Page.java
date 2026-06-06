package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.miniprogram.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 页面实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_page")
@Schema(description = "页面")
public class Page extends BaseEntity {

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

    @Schema(description = "状态 0=草稿 1=已发布 2=已下架")
    private Integer status;

    @Schema(description = "当前发布版本号")
    private Integer currentVersion;

    @Schema(description = "页面描述")
    private String description;
}
