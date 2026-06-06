package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import com.miniprogram.common.BaseEntity;

/**
 * 内容标签实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_content_tag")
public class ContentTag extends BaseEntity {

    private static final long serialVersionUID = 1L;

    /** 标签名称 */
    private String name;

    /** 标签颜色 */
    private String color;

    /** 使用次数 */
    private Integer useCount;
}
