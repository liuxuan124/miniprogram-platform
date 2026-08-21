package com.miniprogram.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class QuestionCreateDTO {
    @NotBlank(message = "问题内容不能为空")
    private String body;
    private List<String> images;
}
