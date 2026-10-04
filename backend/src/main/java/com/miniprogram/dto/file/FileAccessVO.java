package com.miniprogram.dto.file;

import lombok.Data;

@Data
public class FileAccessVO {

    private Long id;

    private String name;

    private String summary;

    /** 自定义图标 URL（列表图标识别，空则端上回退文件类型色块） */
    private String iconUrl;

    private String fileType;

    private Long size;

    private String mimeType;

    private String qualityTier;

    private String readMode;

    private Integer previewPercent;

    private String previewMode;

    private Integer previewValue;

    private Integer pageCount;

    private Boolean allowForward;

    private Boolean watermark;

    private String watermarkText;

    private Integer previewPages;

    private Long boundProductId;

    private Boolean canRead;

    private Boolean canDownload;

    private Boolean canPreview;

    private String previewText;

    private String lockedReason;

    private String minReadLevelName;

    private String minDownloadLevelName;

    /** PDF/DOCX 试读流地址（相对 API 路径） */
    private String previewUrl;

    /** 累计下载次数（公开列表展示） */
    private Long downloadCount;
}
