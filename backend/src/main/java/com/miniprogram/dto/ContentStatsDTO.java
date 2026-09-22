package com.miniprogram.dto;

import lombok.Data;

/**
 * 内容各状态数量统计
 */
@Data
public class ContentStatsDTO {

    private long all;
    private long draft;
    private long scheduled;
    private long published;
    private long unpublished;
    private long deleted;
}
