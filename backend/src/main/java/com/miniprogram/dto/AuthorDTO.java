package com.miniprogram.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 作者档案创建/更新 DTO
 */
@Data
public class AuthorDTO {

    /** 主键（更新时传） */
    private Long id;

    /** 作者昵称 */
    @NotBlank(message = "作者昵称不能为空")
    @Size(max = 64, message = "作者昵称最长64个字符")
    private String name;

    /** 作者头像 URL */
    @Size(max = 512, message = "头像URL最长512个字符")
    private String avatarUrl;

    /** 作者身份 owner/editor/contributor/user */
    private String role;

    /** 头衔/职位 */
    @Size(max = 64, message = "头衔最长64个字符")
    private String title;

    /** 简介 */
    @Size(max = 512, message = "简介最长512个字符")
    private String intro;

    /** 联系方式（仅后台可见） */
    @Size(max = 128, message = "联系方式最长128个字符")
    private String contact;

    /** 排序值 */
    private Integer sortOrder;

    /** 状态 0=停用 1=启用 */
    private Integer status;

    /** 关联内容数（mp_content.author_id = 本档案，未删除） */
    private Integer contentCount;

    /** 关联商品/专栏数（mp_product.author_id = 本档案，未删除） */
    private Integer productCount;

    /** 关联的小程序用户ID（V114 新增；纯内容作者为 null） */
    private Long userId;

    /**
     * 请求体里是否出现过 userId 字段。
     * 用来区分两种情况：普通更新（没带 userId）与显式解绑（传了 userId: null）。
     * 前端「解除关联」要真的把外键置空，所以必须能识别显式 null。
     */
    @com.fasterxml.jackson.annotation.JsonIgnore
    private boolean userIdPresent;

    @com.fasterxml.jackson.annotation.JsonSetter("userId")
    public void setUserId(Long userId) {
        this.userId = userId;
        this.userIdPresent = true;
    }

    public boolean isUserIdPresent() {
        return userIdPresent;
    }

    /** 关联用户的昵称（联表回填，供后台展示「这位作者就是这位用户」） */
    private String userNickname;

    /** 该作者在用户池里挂的角色标签名（V114：is_role=1 的标签，多个用逗号分隔） */
    private String roleTags;
}