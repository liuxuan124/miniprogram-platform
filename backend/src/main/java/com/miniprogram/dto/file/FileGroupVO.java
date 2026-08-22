package com.miniprogram.dto.file;

import lombok.Data;

@Data
public class FileGroupVO {

    private Long id;

    private String name;

    private Integer sortOrder;

    private Long count;
}
