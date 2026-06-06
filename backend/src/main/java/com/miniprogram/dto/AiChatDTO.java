package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * AI对话请求 DTO
 */
@Data
@Schema(description = "AI对话请求")
public class AiChatDTO {

    @NotBlank(message = "提问内容不能为空")
    @Size(max = 2000, message = "提问内容不能超过2000字")
    @Schema(description = "用户提问", example = "有什么好的商品推荐吗？")
    private String question;

    @Size(max = 64, message = "会话ID不能超过64字符")
    @Schema(description = "会话ID，首次对话可不传，后续对话传入以保持上下文", example = "sess_abc123")
    private String sessionId;
}
