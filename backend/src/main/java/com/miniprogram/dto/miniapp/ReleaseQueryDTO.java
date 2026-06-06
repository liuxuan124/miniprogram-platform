package com.miniprogram.dto.miniapp;

import com.miniprogram.dto.PageDTO;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 版本发布查询 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "版本发布查询参数")
public class ReleaseQueryDTO extends PageDTO {

    @Schema(description = "关键词搜索（版本号/发布说明）")
    private String keyword;

    @Schema(description = "状态 0=草稿 1=已发布 2=已回滚")
    private Integer status;

    @Schema(description = "变更类型: major/minor/patch")
    private String changeType;
}
