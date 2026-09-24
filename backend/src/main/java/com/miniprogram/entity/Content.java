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

    /** 租户ID */
    private Long tenantId;

    /** 文章标题 */
    private String title;

    /** 内容形态 article=长文 note=笔记 moment=动态 video=视频 data=数据 */
    private String contentType;

    /** 是否星球专属（付费会员可见全文/下载） */
    private Integer planetExclusive;

    /** 所属星球 ID（communities.id）；空则归入配置 primary */
    private String planetId;

    /** 分类ID */
    private Long categoryId;

    /** 封面图URL */
    private String coverImage;

    /** 视频地址（contentType=video） */
    private String videoUrl;

    /** 视频时长（秒） */
    private Integer videoDuration;

    /** 笔记多图 URL 列表（JSON 数组） */
    private String images;

    /** 资料附件列表（JSON 数组） */
    private String attachments;

    /** 附件数量 */
    private Integer attachmentCount;

    /** 文章摘要 */
    private String summary;

    /** SEO/分享标题 */
    private String seoTitle;

    /** SEO/分享描述 */
    private String seoDescription;

    /** 正文排版主题 standard/magazine/minimal/large/dark */
    private String layoutTheme;

    /** 发现页展示：auto=跟装修规则 full=通栏 duo=双列 */
    private String discoverLayout;

    /** 文章内容（富文本HTML） */
    private String content;

    /** 作者 */
    private String author;

    /** 作者角色: owner/editor/contributor/user */
    private String authorRole;

    /** 作者头像 URL */
    private String authorAvatar;

    /** 来源 */
    private String source;

    /** 版权性质 original|reprint|compile */
    private String copyrightNature;

    /** 参考来源 JSON 数组 */
    private String copyrightSourcesJson;

    /** 转载授权说明/链接 */
    private String reprintAuthorization;

    /** 外部来源标识，如 wechat_oa */
    private String externalSource;

    /** 外部唯一 ID */
    private String externalId;

    /** 来源标签 wechat_mp / xiaohongshu / manual */
    private String sourceTag;

    /** 原文链接（公众号/小红书等） */
    private String originalUrl;

    /** 同步时不覆盖的字段（JSON 数组） */
    private String localOverrideFlags;

    /** 试读比例 0-100，空则走 access_rule 默认 */
    private Integer previewPercent;

    /** 标签列表（JSON数组） */
    private String tags;

    /** 浏览量 */
    private Integer viewCount;

    /** 点赞量 */
    private Integer likeCount;

    /** 收藏量（展示用） */
    private Integer favoriteCount;

    /** 排序值，越小越靠前 */
    private Integer sortOrder;

    /** 频道置顶 */
    private Integer isPinned;

    /** 星球精华 */
    private Integer isEssence;

    /** 首页推荐 */
    private Integer isRecommended;

    /** 状态 draft/scheduled/published/unpublished/deleted */
    private String status;

    /** 审核状态 pending/machine_passed/approved/rejected/auto_blocked */
    private String auditStatus;

    /** 可见性 public/member_only/removed */
    private String visibility;

    /** 最近一次上架时间（展示用，可刷新） */
    private LocalDateTime publishedAt;

    /** 首次上架时间（永不改） */
    private LocalDateTime firstPublishedAt;

    /** 最近下架时间 */
    private LocalDateTime unpublishedAt;

    /** 进回收站时间（软删，配合 status=deleted；不用 TableLogic） */
    private LocalDateTime deletedAt;

    /** 下架原因（可选） */
    private String unpublishReason;

    /** 定时发布时间（status=scheduled，到点自动发布） */
    private LocalDateTime scheduledAt;
}
