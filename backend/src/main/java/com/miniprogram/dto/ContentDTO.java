package com.miniprogram.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/**
 * 内容文章创建/更新 DTO
 */
@Data
public class ContentDTO {

    /** 文章标题 */
    @NotBlank(message = "文章标题不能为空")
    @Size(max = 128, message = "文章标题最长128个字符")
    private String title;

    /** 分类ID */
    private Long categoryId;

    /** 封面图URL */
    private String coverImage;

    /** 文章摘要 */
    @Size(max = 512, message = "文章摘要最长512个字符")
    private String summary;

    /** 文章内容（富文本HTML） */
    private String content;

    /** 作者 */
    @Size(max = 64, message = "作者最长64个字符")
    private String author;

    /** 来源 */
    @Size(max = 128, message = "来源最长128个字符")
    private String source;

    /** 标签列表 */
    private List<String> tags;

    /** 排序值 */
    private Integer sortOrder;
}
