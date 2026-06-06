package com.miniprogram.dto.module;

import com.miniprogram.dto.PageDTO;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "模块版本查询参数")
public class ModuleVersionQueryDTO extends PageDTO {

    @Schema(description = "模块类型")
    private String moduleType;

    @Schema(description = "目标数据ID")
    private Long targetId;

    @Schema(description = "关键词（版本号/变更摘要）")
    private String keyword;

    @Schema(description = "状态 0=草稿 1=已发布 2=已回滚")
    private Integer status;
}
