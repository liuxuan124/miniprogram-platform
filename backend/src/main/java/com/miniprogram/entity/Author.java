package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import com.miniprogram.common.BaseEntity;

/**
 * 作者档案实体
 * 发布内容时下拉选择作者，自动带出头像和身份；
 * mp_content 仍保留 author/author_avatar/author_role 三字段用于小程序渲染，
 * 选档案后由后端把档案的 name/avatar/role 回填到三字段。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_author")
public class Author extends BaseEntity {

    private static final long serialVersionUID = 1L;

    /** 租户ID */
    private Long tenantId;

    /** 作者昵称 */
    private String name;

    /** 作者头像 URL */
    private String avatarUrl;

    /** 作者身份 owner/editor/contributor/user */
    private String role;

    /** 头衔/职位（如：主理人、特约作者） */
    private String title;

    /** 简介 */
    private String intro;

    /** 联系方式（微信号/邮箱等，仅后台可见） */
    private String contact;

    /** 排序值，越小越靠前 */
    private Integer sortOrder;

    /** 状态 0=停用 1=启用 */
    private Integer status;
}