package com.miniprogram.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class AnswerDetailDTO {
    private Long id;
    private Long questionId;
    private Long adminUserId;
    private String adminName;
    private String content;
    private List<ContentAttachmentDTO> attachments;
    private LocalDateTime publishedAt;
}
