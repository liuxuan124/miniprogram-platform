package com.miniprogram.dto.mini;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@Schema(description = "小程序草稿预览 JWT")
public class ContentPreviewTokenCreateVO {

    private String token;
    private String jti;
    private String expiresAt;
    @Schema(description = "体验版启动 query，如 pt=...")
    private String launchQuery;

    @Schema(description = "小程序码 scene（与 jti 相同，≤32 字符）")
    private String scene;

    @Schema(description = "扫码进入页面，如 pages/index/index")
    private String pagePath;

    @Schema(description = "微信体验版小程序码 PNG Base64（未配置 AppID 时为空）")
    private String wxQrcodeBase64;
}
