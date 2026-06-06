package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.miniprogram.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 表单模板实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_form_template")
@Schema(description = "表单模板")
public class FormTemplate extends BaseEntity {

    @Schema(description = "表单名称")
    private String name;

    @Schema(description = "表单描述")
    private String description;

    @Schema(description = "表单字段定义JSON")
    private String fields;

    @Schema(description = "状态 0=停用 1=启用")
    private Integer status;

    @Schema(description = "提交次数")
    private Integer submitCount;
}
