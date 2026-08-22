package com.miniprogram.dto.file;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class FileItemDTO {

    @NotBlank(message = "文件名称不能为空")
    private String name;

    private String summary;

    private Long groupId;

    /** 上传后返回的相对 storageKey 或从 url 解析 */
    @NotBlank(message = "存储路径不能为空")
    private String storageKey;

    private String mimeType;

    private String fileType;

    private Long size;

    private String status;

    private String qualityTier;

    private String readMode;

    private Integer previewPercent;

    private Long minReadLevelId;

    private Integer allowDownload;

    private String downloadAudience;

    private Long minDownloadLevelId;
}
