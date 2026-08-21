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
}
