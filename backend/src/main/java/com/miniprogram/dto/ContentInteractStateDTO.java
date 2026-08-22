package com.miniprogram.dto;

import lombok.Data;

@Data
public class ContentInteractStateDTO {
    private Long contentId;
    private Integer likeCount;
    private Integer favoriteCount;
    private Integer commentCount;
    private Boolean liked;
    private Boolean favorited;
}
