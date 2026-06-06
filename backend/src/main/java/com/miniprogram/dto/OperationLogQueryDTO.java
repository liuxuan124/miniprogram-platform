package com.miniprogram.dto;

import lombok.Data;

@Data
public class OperationLogQueryDTO {
    private String username;
    private String operation;
    private String startDate;
    private String endDate;
    private Integer page = 1;
    private Integer pageSize = 20;
}
