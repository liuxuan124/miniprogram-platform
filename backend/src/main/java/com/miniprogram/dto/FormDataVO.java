package com.miniprogram.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 表单提交记录 VO
 */
@Data
@Schema(description = "表单提交记录")
public class FormDataVO {

    @Schema(description = "记录ID")
    private Long id;

    @Schema(description = "表单模板ID")
    private Long formId;

    @Schema(description = "提交用户ID")
    private Long userId;

    @Schema(description = "提交的表单数据JSON")
    private String data;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;
}
