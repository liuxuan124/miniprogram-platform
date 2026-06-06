package com.miniprogram.dto;

import lombok.Data;

@Data
public class PageAccessReportDTO {
    private Long pageId;
    private String pagePath;
    private String sessionId;
    private String source;
    private Integer stayDuration;
}
