package com.miniprogram.dto.file;

import lombok.Data;

@Data
public class FileAccessVO {

    private Long id;

    private String name;

    private String summary;

    private String fileType;

    private Long size;

    private String mimeType;

    private String qualityTier;

    private String readMode;

    private Integer previewPercent;

    private Boolean canRead;

    private Boolean canDownload;

    private Boolean canPreview;

    private String previewText;

    private String lockedReason;

    private String minReadLevelName;

    private String minDownloadLevelName;
}
