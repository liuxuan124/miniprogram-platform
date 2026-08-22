package com.miniprogram.dto.wechat;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 从公众号文章公开页解析出的内容
 */
@Data
@Builder
public class ParsedWeChatArticle {

    private String sourceUrl;
    private String slug;
    private String title;
    private String author;
    private String coverImageUrl;
    private String contentHtml;
    private LocalDateTime publishedAt;
}
