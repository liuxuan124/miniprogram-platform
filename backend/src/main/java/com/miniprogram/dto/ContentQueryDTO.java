package com.miniprogram.dto;

import lombok.Data;

/**
 * 内容文章查询 DTO
 */
@Data
public class ContentQueryDTO {

    /** 当前页码 */
    private Integer current = 1;

    /** 每页条数 */
    private Integer size = 10;

    /** 关键词搜索（标题模糊匹配） */
    private String keyword;

    /** 分类ID筛选 */
    private Long categoryId;

    /** 多分类ID筛选（逗号分隔，DSL 页签「多类别」选用） */
    private String categoryIds;

    /** 标签筛选 */
    private String tag;

    /** 状态筛选 */
    private String status;

    /** 内容形态筛选 note/article/video/data */
    private String contentType;

    /** 多内容形态筛选（逗号分隔，DSL 页签「内容形式」多选用）：note,article,moment */
    private String contentTypes;

    /** 来源筛选 */
    private String source;

    /** 星球专属 0/1 */
    private Integer planetExclusive;

    /** 所属星球 ID（communities.id） */
    private String planetId;

    /** 审核状态 pending/machine_passed/approved/rejected/auto_blocked */
    private String auditStatus;

    /** 作者身份 owner/editor/contributor/user 等 */
    private String authorRole;

    /** 作者名精确筛选（首页暖阁出品） */
    private String author;

    /** 作者档案ID筛选（作者作品列表页） */
    private Long authorId;

    /** 排序：hot / new / vip */
    private String sortBy;

    /** 按内容 ID 精确筛选（列表接口，不走详情以免浏览量 +1） */
    private Long id;

    /** 按多个内容 ID 筛选（逗号分隔，DSL「指定内容」页签用） */
    private String ids;

    /** 推荐筛选：1=仅推荐 */
    private Integer recommended;
}
