package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("mp_community_post")
public class CommunityPost implements Serializable {
    private static final long serialVersionUID = 1L;
    @TableId(type = IdType.AUTO)
    private Long id;
    private String communityId;
    /**
     * 桥接 mp_content.id：正文、图片、附件统一由 mp_content 承载，
     * 本表只保留社区专属运营元数据（kind/pinned/essence/hidden/replyText）。
     * V104 起生效；V104 之前的老数据 content_id 为 NULL，靠 id 字段回退取 textContent。
     */
    private Long contentId;
    private String authorName;
    private Long userId;
    private String kind;
    @TableField("text_content")
    private String textContent;
    private String topic;
    private Integer pinned;
    private Integer essence;
    private Integer hidden;
    private Integer likes;
    private Integer comments;
    private String replyText;

    /**
     * 非表字段：从桥接的 mp_content 回填（列表展示用），序列化给前端。
     * 正文与附件以 mp_content 为准，本表不存副本。
     */
    @TableField(exist = false)
    private String attachments;

    @TableField(exist = false)
    private Integer attachmentCount;

    /**
     * 以下同为 mp_content 回填字段。
     * 背景（V111）：动态管理并入社区管理后，社区内容管理台是动态的唯一管理入口，
     * 需要在一张列表里同时看到「内容库状态」与「社区运营位」，否则运营仍要回内容库改上下架。
     */
    @TableField(exist = false)
    private String title;

    /** mp_content.status：draft 草稿 / published 已上架 / offline 已下架 */
    @TableField(exist = false)
    private String status;

    @TableField(exist = false)
    private String images;

    @TableField(exist = false)
    private Integer viewCount;

    @TableField(exist = false)
    private Integer likeCount;

    @TableField(exist = false)
    private String summary;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("create_time")
    private LocalDateTime createTime;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("update_time")
    private LocalDateTime updateTime;
}
