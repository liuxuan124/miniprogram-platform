package com.miniprogram.dto;

import lombok.Data;

@Data
public class PageAccessVO {
    private String pagePath;
    private Long visitCount;
}
