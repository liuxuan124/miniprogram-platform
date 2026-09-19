package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 商品创建/更新 DTO
 */
@Data
@Schema(description = "商品创建/更新参数")
public class ProductDTO {

    @NotBlank(message = "商品名称不能为空")
    @Schema(description = "商品名称")
    private String name;

    @NotNull(message = "分类ID不能为空")
    @Schema(description = "分类ID")
    private Long categoryId;

    @Pattern(regexp = "^(physical|digital|service|membership|ebook|column|resource_pack)$", message = "商品类型不合法")
    @Schema(description = "主商品类型；若传 productTypes 则以列表为准")
    private String productType;

    @Schema(description = "商品类型列表，可多选")
    private List<String> productTypes;

    @Schema(description = "主图URL")
    private String mainImage;

    @Schema(description = "图片列表")
    private List<String> images;

    @Schema(description = "简介")
    private String description;

    @Schema(description = "详情(富文本)")
    private String detail;

    @NotNull(message = "售价不能为空")
    @Schema(description = "售价")
    private BigDecimal price;

    @Schema(description = "原价")
    private BigDecimal originalPrice;

    @Schema(description = "会员价")
    private BigDecimal memberPrice;

    @Schema(description = "会员免费")
    private Integer memberFree;

    @Schema(description = "总库存")
    private Integer stock = 0;

    @Schema(description = "单位")
    private String unit = "件";

    @Schema(description = "排序")
    private Integer sortOrder = 0;

    @Schema(description = "数字商品支付后自动履约")
    private Integer autoFulfill;

    @Schema(description = "交付方式 auto/manual/redeem_code")
    private String deliveryMode;

    @Schema(description = "退款政策 none/before_read/seven_days")
    private String refundPolicy;

    @Schema(description = "免费试读章数")
    private Integer previewChapters;

    @Schema(description = "自动发货内容")
    private String fulfillContent;

    @Schema(description = "会员天数，0=终身")
    private Integer membershipDays;

    @Schema(description = "开通后的会员等级ID（旧字段，兼容）")
    private Long membershipLevelId;

    @Schema(description = "绑定的付费会员档ID（会员商品必填；一期无独立星球意图字段，平台/星球由 plan.scope 表达）")
    private Long membershipPlanId;

    @Schema(description = "SKU列表")
    private List<ProductSkuDTO> skus;

    @Schema(description = "定时上架时间")
    private java.time.LocalDateTime publishAt;
}
