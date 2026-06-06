package com.miniprogram.dto.statistics;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 用户增长数据项 VO
 */
@Data
@Schema(description = "用户增长数据项")
public class UserGrowthItemVO {

    @Schema(description = "日期")
    private String date;

    @Schema(description = "新增用户数")
    private Integer newUsers;

    @Schema(description = "累计用户数")
    private Integer totalUsers;
}
