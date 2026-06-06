package com.miniprogram.dto;

import lombok.Data;

@Data
public class UserGrowthVO {
    private String date;
    private Long newUsers;
    private Long totalUsers;
}
