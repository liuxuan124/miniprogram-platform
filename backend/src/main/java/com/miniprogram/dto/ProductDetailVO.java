package com.miniprogram.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 商品详情 VO
 */
@Data
@Schema(description = "商品详情")
public class ProductDetailVO {

    @Schema(description = "商品ID")
    private Long id;

    @Schema(description = "商品名称")
    private String name;

    @Schema(description = "分类ID")
    private Long categoryId;

    @Schema(description = "分类名称")
    private String categoryName;

    @Schema(description = "商品类型: physical/digital/service（主类型）")
    private String productType;

    @Schema(description = "商品类型列表（可多选）")
    private List<String> productTypes;

    @Schema(description = "主图URL")
    private String mainImage;

    @Schema(description = "图片列表")
    private List<String> images;

    @Schema(description = "简介")
    private String description;

    @Schema(description = "详情(富文本)")
    private String detail;

    @Schema(description = "售价")
    private BigDecimal price;

    @Schema(description = "原价")
    private BigDecimal originalPrice;

    @Schema(description = "会员价")
    private BigDecimal memberPrice;

    @Schema(description = "会员免费")
    private Integer memberFree;

    @Schema(description = "交付方式")
    private String deliveryMode;

    @Schema(description = "退款政策")
    private String refundPolicy;

    @Schema(description = "试读章数")
    private Integer previewChapters;

    @Schema(description = "当前用户是否已购（虚拟商品权益）")
    private Boolean purchased;

    @Schema(description = "总库存")
    private Integer stock;

    @Schema(description = "销量")
    private Integer sales;

    @Schema(description = "单位")
    private String unit;

    @Schema(description = "排序")
    private Integer sortOrder;

    @Schema(description = "状态: draft/on_sale/off_sale")
    private String status;

    @Schema(description = "定时上架时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime publishAt;

    @Schema(description = "支付后自动履约")
    private Integer autoFulfill;

    @Schema(description = "自动发货内容")
    private String fulfillContent;

    @Schema(description = "会员天数，0=终身")
    private Integer membershipDays;

    @Schema(description = "开通后的会员等级ID")
    private Long membershipLevelId;

    @Schema(description = "SKU列表")
    private List<ProductSkuVO> skus;

    @Schema(description = "创建时间")
    private String createdAt;

    @Schema(description = "更新时间")
    private String updatedAt;
}
