package com.miniprogram.dto;

import lombok.Data;

import java.util.List;

@Data
public class SystemConfigBatchDTO {
    private List<SystemConfigDTO> configs;
}
