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

    /** 内容形态 article=长文 note=笔记 moment=动态 video=视频 data=数据 */
    private String contentType;

    /** 分类ID */
    private Long categoryId;

    /** 分类名称 */
    private String categoryName;

    /** 封面图URL */
    private String coverImage;

    /** 视频地址 */
    private String videoUrl;

    /** 视频时长（秒） */
    private Integer videoDuration;

    /** 笔记多图 URL 列表 */
    private List<String> images;

    /** 资料附件列表 */
    private List<ContentAttachmentDTO> attachments;

    /** 附件数量 */
    private Integer attachmentCount;

    /** 文章摘要 */
    private String summary;

    /** SEO/分享标题 */
    private String seoTitle;

    /** SEO/分享描述 */
    private String seoDescription;

    /** 正文排版主题 */
    private String layoutTheme;

    /** 发现页展示 auto/full/duo */
    private String discoverLayout;

    /** 文章内容（富文本HTML） */
    private String content;

    /** 作者 */
    private String author;

    /** 作者角色 */
    private String authorRole;

    /** 可见性 */
    private String visibility;

    /** 审核状态 */
    private String auditStatus;

    /** 作者头像 URL */
    private String authorAvatar;

    /** 来源 */
    private String source;

    /** 版权性质 original|reprint|compile */
    private String copyrightNature;

    /** 参考来源 */
    private List<String> copyrightSources;

    /** 转载授权说明 */
    private String reprintAuthorization;

    /** 外部来源标识，如 wechat_oa */
    private String externalSource;

    /** 标签列表 */
    private List<String> tags;

    /** 浏览量 */
    private Integer viewCount;

    /** 点赞量 */
    private Integer likeCount;

    /** 收藏量（展示用） */
    private Integer favoriteCount;

    /** 排序值 */
    private Integer sortOrder;

    /** 频道置顶 */
    private Integer isPinned;

    /** 首页推荐 */
    private Integer isRecommended;

    /** 星球专属 */
    private Integer planetExclusive;

    /** 所属星球 ID（communities.id） */
    private String planetId;

    /** 当前用户是否可看全文/下载 */
    private Boolean accessGranted;

    /** 是否被门禁锁定（未付费） */
    private Boolean locked;

    /** 锁定原因 */
    private String lockedReason;

    /** 试读比例（未解锁时） */
    private Integer previewPercent;

    /** 解锁方式（会员/单篇/星球等） */
    private java.util.List<com.miniprogram.entitlement.dto.EntitlementUnlockOption> unlockOptions;

    /** 原文链接 */
    private String originalUrl;

    /** 状态 draft/scheduled/published/unpublished/deleted */
    private String status;

    /** 最近一次上架时间 */
    private LocalDateTime publishedAt;

    /** 首次上架时间 */
    private LocalDateTime firstPublishedAt;

    /** 最近下架时间 */
    private LocalDateTime unpublishedAt;

    /** 进回收站时间 */
    private LocalDateTime deletedAt;

    /** 下架原因 */
    private String unpublishReason;

    /** 定时发布时间 */
    private LocalDateTime scheduledAt;

    /** 当前用户是否已点赞（小程序详情） */
    private Boolean liked;

    /** 当前用户是否已收藏（小程序详情） */
    private Boolean favorited;

    /** 评论数 */
    private Integer commentCount;

    /** 创建时间 */
    private LocalDateTime createTime;

    /** 更新时间 */
    private LocalDateTime updateTime;
}
