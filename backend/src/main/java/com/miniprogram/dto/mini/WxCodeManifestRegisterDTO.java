package com.miniprogram.dto.mini;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.Map;

@Data
@Schema(description = "登记微信代码包能力清单（CI/上传后）")
public class WxCodeManifestRegisterDTO {

    @Schema(description = "上传版本号，与 wx_version 对齐")
    private String wxVersion;

    @Schema(description = "capabilities.json 解析结果")
    private Map<String, Object> manifest;
}
