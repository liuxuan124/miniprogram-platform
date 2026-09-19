package com.miniprogram.dto.system;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 小程序本地读文件后的 Base64 上传（绕过 uploadFile 合法域名未配置时的客户端拦截）
 */
@Data
@Schema(description = "Base64 文件上传请求")
public class Base64UploadRequest {

    @Schema(description = "文件 Base64（可带 data:image/...;base64, 前缀）", requiredMode = Schema.RequiredMode.REQUIRED)
    private String contentBase64;

    @Schema(description = "原始文件名，用于推断扩展名", example = "avatar.jpg")
    private String fileName;

    @Schema(description = "上传子目录", example = "avatar")
    private String subDir;
}
