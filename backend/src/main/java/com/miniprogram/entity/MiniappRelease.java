package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.miniprogram.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 小程序版本发布实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_miniapp_release")
@Schema(description = "小程序版本发布")
public class MiniappRelease extends BaseEntity {

    @Schema(description = "语义化版本号")
    private String semver;

    @Schema(description = "主版本号")
    private Integer major;

    @Schema(description = "次版本号")
    private Integer minor;

    @Schema(description = "修订号")
    private Integer patch;

    @Schema(description = "变更类型: major/minor/patch")
    private String changeType;

    @Schema(description = "发布说明")
    private String releaseNotes;

    @Schema(description = "发布快照(所有已发布页面DSL+系统配置的JSON)")
    @TableField("snapshot")
    private String snapshot;

    @Schema(description = "回滚前备份快照")
    @TableField("backup_snapshot")
    private String backupSnapshot;

    @Schema(description = "包含页面数")
    private Integer pageCount;

    @Schema(description = "状态 0=草稿 1=已发布 2=已回滚")
    private Integer status;

    @Schema(description = "发布模式: template=模板, publish=直接发布")
    private String mode;

    @Schema(description = "发布时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime publishedAt;

    @Schema(description = "发布人ID")
    private Long publisherId;

    @Schema(description = "发布人姓名")
    private String publisherName;

    @Schema(description = "回滚时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime rolledBackAt;

    @Schema(description = "回滚操作人ID")
    private Long rolledBackBy;

    @Schema(description = "从哪个版本回滚而来")
    private String rolledBackFrom;
}
