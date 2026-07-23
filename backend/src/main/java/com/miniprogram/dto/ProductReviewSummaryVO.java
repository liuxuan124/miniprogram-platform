package com.miniprogram.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class ProductReviewSummaryVO {
    private Double avgScore;
    private Long total;
    private Map<Integer, Long> scoreDist;
    private List<String> hotTags;
    private List<ProductReviewVO> records;
}
