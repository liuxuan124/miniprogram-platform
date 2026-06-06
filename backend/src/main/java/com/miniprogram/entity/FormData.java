package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.miniprogram.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 表单数据实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_form_data")
@Schema(description = "表单数据")
public class FormData extends BaseEntity {

    @Schema(description = "表单模板ID")
    private Long formId;

    @Schema(description = "提交用户ID")
    private Long userId;

    @Schema(description = "提交的表单数据JSON")
    private String data;
}
