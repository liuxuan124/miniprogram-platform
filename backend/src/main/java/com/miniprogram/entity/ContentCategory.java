package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import com.miniprogram.common.BaseEntity;

/**
 * 内容分类实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_content_category")
public class ContentCategory extends BaseEntity {

    private static final long serialVersionUID = 1L;

    /** 分类名称 */
    private String name;

    /** 父分类ID，0表示顶级分类 */
    private Long parentId;

    /** 排序值，越小越靠前 */
    private Integer sortOrder;

    /** 分类图标URL */
    private String icon;

    /** 状态 0=禁用 1=启用 */
    private Integer status;
}
