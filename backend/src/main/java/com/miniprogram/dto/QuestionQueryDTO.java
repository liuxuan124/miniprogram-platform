package com.miniprogram.dto;

import lombok.Data;

@Data
public class QuestionQueryDTO {
    private Long current = 1L;
    private Long size = 10L;
    private String status;
    private Long userId;
}
