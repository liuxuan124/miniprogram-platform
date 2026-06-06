package com.miniprogram.dto.miniapp;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "推送微信小程序体验版请求")
public class PushPreviewDTO {

    @Schema(description = "上传描述，默认使用版本发布说明")
    private String versionDesc;

    @Schema(description = "是否确认本次包含 miniapp 代码变更")
    private Boolean confirmCodeChange;
}
