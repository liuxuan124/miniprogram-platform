package com.miniprogram.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class ProductReviewVO {
    private Long id;
    private Long productId;
    private Integer score;
    private List<String> tags;
    private String content;
    private List<String> images;
    private Boolean anonymous;
    private String nickname;
    private String avatar;
    private LocalDateTime createTime;
}
