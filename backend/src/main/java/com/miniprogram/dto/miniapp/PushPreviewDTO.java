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

    @Schema(description = "推送目标 ID（mp_wx_push_target）；不传则用默认目标或系统配置")
    private Long targetId;

    @Schema(description = "可选覆盖 AppID（须与目标或已有密钥匹配）")
    private String appId;
}
