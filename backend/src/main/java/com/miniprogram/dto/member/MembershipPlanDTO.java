package com.miniprogram.dto.member;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Schema(description = "付费会员档请求DTO")
public class MembershipPlanDTO {

    @Schema(description = "范围: platform|planet", requiredMode = Schema.RequiredMode.REQUIRED)
    private String scope;

    @Schema(description = "星球ID；scope=planet 时必填")
    private String planetId;

    @Schema(description = "档位名称", requiredMode = Schema.RequiredMode.REQUIRED)
    private String name;

    @Schema(description = "图标URL")
    private String icon;

    @Schema(description = "描述")
    private String description;

    @Schema(description = "权益码列表")
    private List<String> rights;

    @Schema(description = "商城折扣率(0-1)，仅平台档")
    private BigDecimal discountRate;

    @Schema(description = "赠送目标星球ID，仅平台档")
    private String giftPlanetId;

    @Schema(description = "赠送星球天数；0=不赠送")
    private Integer giftPlanetDays;

    @Schema(description = "专属身份角标：1=开 0=关")
    private Integer showBadge;

    @Schema(description = "到期前提醒天数；0=关闭")
    private Integer expireRemindDays;

    @Schema(description = "排序")
    private Integer sortOrder;

    @Schema(description = "状态: 1=启用, 0=禁用")
    private Integer status;
}
