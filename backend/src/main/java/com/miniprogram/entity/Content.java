package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;
import com.miniprogram.common.BaseEntity;

/**
 * 内容文章实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_content")
public class Content extends BaseEntity {

    private static final long serialVersionUID = 1L;

    /** 文章标题 */
    private String title;

    /** 分类ID */
    private Long categoryId;

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

    /** 标签列表（JSON数组） */
    private String tags;

    /** 浏览量 */
    private Integer viewCount;

    /** 点赞量 */
    private Integer likeCount;

    /** 排序值，越小越靠前 */
    private Integer sortOrder;

    /** 状态 draft=草稿 published=已发布 archived=已归档 */
    private String status;

    /** 发布时间 */
    private LocalDateTime publishedAt;
}
