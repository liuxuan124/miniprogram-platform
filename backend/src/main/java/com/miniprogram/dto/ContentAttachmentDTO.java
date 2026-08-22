package com.miniprogram.dto;

import lombok.Data;

/**
 * 内容资料附件
 */
@Data
public class ContentAttachmentDTO {

    /** 附件唯一标识 */
    private String id;

    /** 展示文件名 */
    private String name;

    /** 文件 URL */
    private String url;

    /** 字节大小 */
    private Long size;

    /** MIME 类型 */
    private String mimeType;

    /** 文件类型简写 pdf/doc/xls/zip/other */
    private String fileType;

    /** 排序 */
    private Integer sortOrder;

    /** 文件库 ID（优先于 url 直链） */
    private Long fileId;

    /** 以下字段由服务端鉴权后填充，客户端只读 */
    private Boolean canRead;
    private Boolean canDownload;
    private Boolean canPreview;
    private String previewText;
    private String lockedReason;
    private String qualityTier;
}
