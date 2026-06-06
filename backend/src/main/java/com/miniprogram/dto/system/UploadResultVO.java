package com.miniprogram.dto.system;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 文件上传结果 VO
 */
@Data
@Schema(description = "文件上传结果")
public class UploadResultVO {

    @Schema(description = "文件名称")
    private String fileName;

    @Schema(description = "原始文件名")
    private String originalFileName;

    @Schema(description = "文件访问URL")
    private String url;

    @Schema(description = "文件大小(字节)")
    private Long fileSize;

    @Schema(description = "文件MIME类型")
    private String contentType;
}
