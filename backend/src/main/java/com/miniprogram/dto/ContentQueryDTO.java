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

    /** 标签筛选 */
    private String tag;

    /** 状态筛选 */
    private String status;
}
