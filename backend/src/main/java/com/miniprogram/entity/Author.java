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

    /**
     * 关联的小程序用户ID（mp_user.id），可空。
     * V114 起：作者接入用户池，让「作者」也能在用户管理里按角色筛选。
     * 纯内容作者（只在后台建档、从不登录小程序）保持 NULL，unique 索引允许多个 NULL。
     */
    private Long userId;

    /** 作者昵称 */
    private String name;

    /** 作者头像 URL */
    private String avatarUrl;

    /** 作者身份 owner/editor/contributor/user */
    private String role;

    /** 头衔/职位（如：主理人、特约作者） */
    private String title;

    /**
     * 作者标签，逗号分隔（如：官方主理人,S级创作者）。
     * V121 新增：给首页作者区块的「动态聚合」模式做筛选维度。
     * 纯内容作者也能打标签 —— 这是不用 mp_member_tag 的原因（那条路要求先接入用户池）。
     */
    private String tags;

    /** 简介 */
    private String intro;

    /** 联系方式（微信号/邮箱等，仅后台可见） */
    private String contact;

    /** 排序值，越小越靠前 */
    private Integer sortOrder;

    /** 状态 0=停用 1=启用 */
    private Integer status;
}