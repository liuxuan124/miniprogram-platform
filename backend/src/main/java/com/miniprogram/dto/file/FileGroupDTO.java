package com.miniprogram.dto.file;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class FileGroupDTO {

    @NotBlank(message = "分组名称不能为空")
    private String name;

    private Integer sortOrder;
}
