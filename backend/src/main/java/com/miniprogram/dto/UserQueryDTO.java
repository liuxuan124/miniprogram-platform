package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 小程序用户列表查询 DTO
 */
@Data
@Schema(description = "小程序用户列表查询参数")
public class UserQueryDTO extends PageDTO {

    @Schema(description = "昵称（模糊查询）")
    private String nickname;

    @Schema(description = "手机号")
    private String phone;

    @Schema(description = "来源渠道")
    private String sourceChannel;
}
