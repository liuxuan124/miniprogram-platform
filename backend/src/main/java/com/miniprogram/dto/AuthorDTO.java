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
}