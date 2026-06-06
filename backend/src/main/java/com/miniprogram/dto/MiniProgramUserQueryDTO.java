package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 小程序用户查询 DTO
 */
@Data
@Schema(description = "小程序用户查询参数")
public class MiniProgramUserQueryDTO extends PageDTO {

    @Schema(description = "关键词（昵称模糊搜索）")
    private String keyword;

    @Schema(description = "手机号")
    private String phone;

    @Schema(description = "来源渠道")
    private String source;
}
