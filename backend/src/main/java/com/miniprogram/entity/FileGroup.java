package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.miniprogram.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_file_group")
@Schema(description = "文件库分组")
public class FileGroup extends BaseEntity {

    private String name;

    private Integer sortOrder;
}
