package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 活动实体
 * 对应 V14 迁移 mp_activity 表
 */
@Data
@TableName("mp_activity")
@Schema(description = "活动")
public class Activity implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "主键ID")
    private Long id;

    @Schema(description = "活动名称")
    private String name;

    @Schema(description = "活动类型")
    private String type;

    @Schema(description = "活动日期")
    private LocalDate date;

    @Schema(description = "活动地点")
    private String venue;

    @Schema(description = "名额上限")
    private Integer quota;

    @Schema(description = "已报名人数")
    private Integer signed;

    @Schema(description = "封面图URL")
    private String cover;

    @Schema(description = "活动描述")
    private String description;

    @Schema(description = "状态: 0=草稿 1=报名中 2=进行中 3=已结束 4=已取消")
    private Integer status;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @Schema(description = "更新时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
}
