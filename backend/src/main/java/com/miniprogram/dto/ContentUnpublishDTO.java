package com.miniprogram.dto;

import lombok.Data;

/**
 * 下架请求（可选原因）
 */
@Data
public class ContentUnpublishDTO {

    /** 下架原因（可选，记 log / 落库） */
    private String reason;
}
