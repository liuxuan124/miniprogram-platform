package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 商品实体
 */
@Data
@TableName("mp_product")
@Schema(description = "商品")
public class Product implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "主键ID")
    private Long id;

    @Schema(description = "商品名称")
    private String name;

    @Schema(description = "分类ID")
    private Long categoryId;

    @Schema(description = "主图URL")
    private String mainImage;

    @Schema(description = "图片列表JSON")
    private String images;

    @Schema(description = "简介")
    private String description;

    @Schema(description = "详情(富文本)")
    private String detail;

    @Schema(description = "售价")
    private BigDecimal price;

    @Schema(description = "原价")
    private BigDecimal originalPrice;

    @Schema(description = "总库存")
    private Integer stock;

    @Schema(description = "销量")
    private Integer sales;

    @Schema(description = "单位")
    private String unit;

    @Schema(description = "排序")
    private Integer sortOrder;

    @Schema(description = "状态: on_sale/off_sale")
    private String status;

    @Schema(description = "商品类型: physical/digital/service")
    private String productType = "physical";

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @Schema(description = "更新时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
}
