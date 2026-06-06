package com.miniprogram.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 内容文章详情 DTO
 */
@Data
public class ContentDetailDTO {

    private Long id;

    /** 文章标题 */
    private String title;

    /** 分类ID */
    private Long categoryId;

    /** 分类名称 */
    private String categoryName;

    /** 封面图URL */
    private String coverImage;

    /** 文章摘要 */
    private String summary;

    /** 文章内容（富文本HTML） */
    private String content;

    /** 作者 */
    private String author;

    /** 来源 */
    private String source;

    /** 标签列表 */
    private List<String> tags;

    /** 浏览量 */
    private Integer viewCount;

    /** 点赞量 */
    private Integer likeCount;

    /** 排序值 */
    private Integer sortOrder;

    /** 状态 draft=草稿 published=已发布 archived=已归档 */
    private String status;

    /** 发布时间 */
    private LocalDateTime publishedAt;

    /** 创建时间 */
    private LocalDateTime createTime;

    /** 更新时间 */
    private LocalDateTime updateTime;
}
