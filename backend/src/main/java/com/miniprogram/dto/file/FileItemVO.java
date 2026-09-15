package com.miniprogram.dto.file;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class FileItemVO {

    private Long id;

    private String name;

    private String summary;

    private Long groupId;

    private String groupName;

    private String storageKey;

    private String mimeType;

    private String fileType;

    private Long size;

    private String status;

    private String qualityTier;

    private String readMode;

    private Long boundProductId;

    private Integer previewPercent;

    private String previewMode;

    private Integer previewValue;

    private Integer pageCount;

    private Integer allowForward;

    private Integer watermark;

    private Long minReadLevelId;

    private String minReadLevelName;

    private Integer allowDownload;

    private String downloadAudience;

    private Long minDownloadLevelId;

    private String minDownloadLevelName;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updateTime;
}
