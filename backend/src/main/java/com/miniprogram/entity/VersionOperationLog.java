package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 版本操作日志实体
 */
@Data
@TableName("mp_version_operation_log")
@Schema(description = "版本操作日志")
public class VersionOperationLog implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "主键ID")
    @TableId(type = IdType.AUTO)
    private Long id;

    @Schema(description = "关联的版本发布ID")
    private Long releaseId;

    @Schema(description = "操作涉及的版本号")
    private String semver;

    @Schema(description = "操作类型: create/publish/rollback")
    private String operation;

    @Schema(description = "操作人ID")
    private Long operatorId;

    @Schema(description = "操作人姓名")
    private String operatorName;

    @Schema(description = "操作详情JSON")
    private String detail;

    @Schema(description = "状态 1=成功 0=失败")
    private Integer status;

    @Schema(description = "错误信息")
    private String errorMsg;

    @Schema(description = "操作IP")
    private String ip;

    @Schema(description = "耗时(ms)")
    private Long duration;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;
}
