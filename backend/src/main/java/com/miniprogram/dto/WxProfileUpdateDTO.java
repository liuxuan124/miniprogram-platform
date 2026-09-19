package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 小程序用户资料更新（昵称 / 头像）
 */
@Data
@Schema(description = "小程序用户资料更新")
public class WxProfileUpdateDTO {

    @Schema(description = "用户昵称")
    private String nickname;

    @Schema(description = "用户头像 URL（须为可公网访问地址，禁止 wxfile://）")
    private String avatarUrl;
}
