package com.miniprogram.dto.member;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Schema(description = "会员等级响应VO")
public class MemberLevelVO {

    @Schema(description = "ID")
    private Long id;

    @Schema(description = "等级名称")
    private String name;

    @Schema(description = "等级图标URL")
    private String icon;

    @Schema(description = "最低积分要求")
    private Integer minPoints;

    @Schema(description = "折扣率")
    private BigDecimal discountRate;

    @Schema(description = "权益描述")
    private List<String> rights;

    @Schema(description = "排序")
    private Integer sortOrder;

    @Schema(description = "状态")
    private Integer status;

    @Schema(description = "创建时间")
    private String createdAt;

    @Schema(description = "更新时间")
    private String updatedAt;
}
