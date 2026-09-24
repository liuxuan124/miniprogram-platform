package com.miniprogram.dto.member;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Schema(description = "付费会员档响应VO")
public class MembershipPlanVO {

    @Schema(description = "ID")
    private Long id;

    @Schema(description = "范围: platform|planet")
    private String scope;

    @Schema(description = "星球ID")
    private String planetId;

    @Schema(description = "档位名称")
    private String name;

    @Schema(description = "图标URL")
    private String icon;

    @Schema(description = "描述")
    private String description;

    @Schema(description = "权益码列表")
    private List<String> rights;

    @Schema(description = "商城折扣率")
    private BigDecimal discountRate;

    @Schema(description = "赠送目标星球ID")
    private String giftPlanetId;

    @Schema(description = "赠送星球天数")
    private Integer giftPlanetDays;

    @Schema(description = "专属身份角标：1=开 0=关")
    private Integer showBadge;

    @Schema(description = "到期前提醒天数；0=关闭")
    private Integer expireRemindDays;

    @Schema(description = "排序")
    private Integer sortOrder;

    @Schema(description = "状态")
    private Integer status;

    @Schema(description = "关联在售商品 ID")
    private Long productId;

    @Schema(description = "展示价（在售会员商品）")
    private BigDecimal displayPrice;

    @Schema(description = "划线原价")
    private BigDecimal originalPrice;

    @Schema(description = "创建时间")
    private String createdAt;

    @Schema(description = "更新时间")
    private String updatedAt;
}
