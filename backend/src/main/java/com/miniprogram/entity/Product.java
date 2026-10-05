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

    @Schema(description = "租户ID")
    private Long tenantId;

    @Schema(description = "商品名称")
    private String name;

    @Schema(description = "分类ID")
    private Long categoryId;

    @Schema(description = "主图URL")
    private String mainImage;

    @Schema(description = "宣传视频URL（详情页首屏轮播首项，可空）")
    private String videoUrl;

    @Schema(description = "宣传视频封面图URL（为空则回退主图）")
    private String videoPosterUrl;

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

    @Schema(description = "会员价")
    private BigDecimal memberPrice;

    @Schema(description = "会员免费：0否 1是")
    private Integer memberFree;

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

    @Schema(description = "测试商品：1是 0否")
    private Integer isTest;

    @Schema(description = "商品类型: physical/digital/service/membership/ebook/column/resource_pack/ticket")
    private String productType = "physical";

    @Schema(description = "商品类型 JSON 数组，可多选")
    private String productTypes;

    @Schema(description = "关联作者档案ID（mp_author.id；为空=官方/未指定）")
    private Long authorId;

    @Schema(description = "详情模板ID（覆盖按 productType 的自动分流；空=自动判断；column_classic/column_compact/column_story/ebook_classic/ebook_reader/ebook_showcase/digital_classic/digital_checklist/digital_video/physical_classic/physical_minimal/physical_story）")
    private String detailTemplate;

    @Schema(description = "支付成功后自动履约（数字商品）")
    private Integer autoFulfill;

    @Schema(description = "交付方式: auto/manual/redeem_code")
    private String deliveryMode = "auto";

    @Schema(description = "退款政策: none/before_read/seven_days")
    private String refundPolicy = "none";

    @Schema(description = "免费试读章数")
    private Integer previewChapters;

    @Schema(description = "定时上架时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime publishAt;

    @Schema(description = "自动发货内容")
    private String fulfillContent;

    @Schema(description = "会员商品有效天数，0=终身")
    private Integer membershipDays;

    @Schema(description = "开通后写入的会员等级 ID")
    private Long membershipLevelId;

    @Schema(description = "付费档位 ID（mp_membership_plan）；会员商品必填，scope 以档位为准")
    private Long membershipPlanId;

    @Schema(description = "买赠：支付成功后额外赠送的会员天数，0=不赠送")
    private Integer giftMembershipDays;

    @Schema(description = "买赠：支付成功后自动加入的星球社区 ID")
    private String giftPlanetId;

    @Schema(description = "买赠：赠送星球天数（星球门禁走订购，需有期限），0=不赠送")
    private Integer giftPlanetDays;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @Schema(description = "更新时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
}
