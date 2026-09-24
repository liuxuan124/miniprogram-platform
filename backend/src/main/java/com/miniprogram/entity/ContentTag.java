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

    /** 租户ID */
    private Long tenantId;

    /** 标签名称 */
    private String name;

    /** 标签颜色 */
    private String color;

    /** platform | topic | custom */
    private String tagKind;

    /** 平台维编码：wechat / xiaohongshu / douyin 等 */
    private String platformCode;

    /** 使用次数 */
    private Integer useCount;
}
