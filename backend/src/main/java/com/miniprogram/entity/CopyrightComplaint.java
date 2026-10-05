package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户举报 / 版权投诉（V118 接入审核中心）。
 *
 * <p>这张表<b>早就存在</b>（V 迁移历史），但后端一直没有实体、Mapper、Service、接口，
 * 小程序 C 端两处「举报」按钮也只弹 toast 不发请求，所以表里 0 行 —— 举报功能实质是坏的。
 * 2026-10-05 补齐这条链路。
 *
 * <p>{@code evidenceUrls} 用 JSON 列存字符串数组，实体侧用 String 承接（由 Service 序列化），
 * 避免为一个字段引入手写 TypeHandler。
 */
@Data
@TableName("mp_copyright_complaint")
@Schema(description = "用户举报/版权投诉")
public class CopyrightComplaint {

    @TableId(type = IdType.AUTO)
    @Schema(description = "主键")
    private Long id;

    @Schema(description = "租户ID")
    private Long tenantId;

    @Schema(description = "举报对象类型：content 内容 / moment 动态 / comment 评论 / planet_post 星球动态 / product 商品 / author 作者")
    private String targetType;

    @Schema(description = "举报对象ID")
    private Long targetId;

    @Schema(description = "举报人用户ID（未登录为空）")
    private Long reporterUserId;

    @Schema(description = "举报人联系方式（选填）")
    private String contact;

    @Schema(description = "举报理由")
    private String reason;

    @Schema(description = "处理状态：pending 待处理 / accepted 已受理（已下架/已封禁）/ rejected 已驳回")
    private String status;

    @Schema(description = "处理备注")
    private String adminNote;

    @Schema(description = "处理人（后台账号ID）")
    private Long handlerId;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Schema(description = "处理时间")
    private LocalDateTime handledAt;

    @Schema(description = "证据图片URL数组（JSON 字符串，形如 [\"https://.../a.jpg\"]）")
    private String evidenceUrls;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Schema(description = "举报时间")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Schema(description = "更新时间")
    private LocalDateTime updatedAt;
}
