package com.miniprogram.dto;

import lombok.Data;

@Data
public class SystemConfigDTO {
    private String configKey;
    private String configValue;
    private String configGroup;
    private String description;
}
