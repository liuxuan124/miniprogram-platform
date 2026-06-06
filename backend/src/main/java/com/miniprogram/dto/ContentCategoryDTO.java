package com.miniprogram.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 内容分类 DTO
 */
@Data
public class ContentCategoryDTO {

    private Long id;

    /** 分类名称 */
    @NotBlank(message = "分类名称不能为空")
    @Size(max = 64, message = "分类名称最长64个字符")
    private String name;

    /** 父分类ID */
    private Long parentId;

    /** 排序值 */
    private Integer sortOrder;

    /** 分类图标URL */
    private String icon;

    /** 状态 0=禁用 1=启用 */
    private Integer status;

    /** 创建时间 */
    private LocalDateTime createTime;

    /** 更新时间 */
    private LocalDateTime updateTime;

    /** 子分类列表（树形结构用） */
    private List<ContentCategoryDTO> children;
}
