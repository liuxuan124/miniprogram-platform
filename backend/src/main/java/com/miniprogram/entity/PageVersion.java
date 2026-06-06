package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.miniprogram.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 页面版本实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_page_version")
@Schema(description = "页面版本")
public class PageVersion extends BaseEntity {

    @Schema(description = "页面ID")
    private Long pageId;

    @Schema(description = "版本号")
    private Integer version;

    @Schema(description = "页面DSL内容（JSON）")
    private String dslContent;

    @Schema(description = "状态 0=草稿 1=已发布 2=已回滚")
    private Integer status;

    @Schema(description = "发布时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime publishedAt;

    @Schema(description = "发布人ID")
    private Long publisherId;
}
