package com.miniprogram.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 内容标签 DTO
 */
@Data
public class ContentTagDTO {

    private Long id;

    /** 标签名称 */
    private String name;

    /** 标签颜色 */
    private String color;

    /** platform | topic | custom */
    @JsonProperty("tag_kind")
    private String tagKind;

    @JsonProperty("platform_code")
    private String platformCode;

    /** 使用次数 */
    @JsonProperty("content_count")
    private Integer useCount;

    /** 创建时间 */
    @JsonProperty("created_at")
    private LocalDateTime createTime;
}
