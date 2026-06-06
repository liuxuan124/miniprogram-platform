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

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_module_version")
@Schema(description = "通用模块版本")
public class ModuleVersion extends BaseEntity {

    @Schema(description = "模块类型")
    private String moduleType;

    @Schema(description = "关联的业务数据ID")
    private Long targetId;

    @Schema(description = "语义化版本号")
    private String semver;

    @Schema(description = "主版本号")
    private Integer major;

    @Schema(description = "次版本号")
    private Integer minor;

    @Schema(description = "修订号")
    private Integer patch;

    @Schema(description = "版本数据快照JSON")
    @TableField("version_data")
    private String versionData;

    @Schema(description = "变更摘要")
    private String changeSummary;

    @Schema(description = "状态 0=草稿 1=已发布 2=已回滚")
    private Integer status;

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
}
