package com.miniprogram.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class QuestionDetailDTO {
    private Long id;
    private Long userId;
    private String userNickname;
    private String body;
    private List<String> images;
    private String status;
    private Integer viewCount;
    private LocalDateTime createTime;
    private AnswerDetailDTO answer;
}
