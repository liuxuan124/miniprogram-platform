package com.miniprogram.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class AnswerCreateDTO {
    @NotBlank(message = "回答内容不能为空")
    private String content;
    private List<ContentAttachmentDTO> attachments;
}
