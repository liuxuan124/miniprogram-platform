package com.miniprogram.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class ProductReviewCreateDTO {
    @NotNull
    private Long productId;
    private Long orderId;
    @NotNull
    @Min(1)
    @Max(5)
    private Integer score;
    private List<String> tags;
    private String content;
    private List<String> images;
    private Boolean anonymous;
}
