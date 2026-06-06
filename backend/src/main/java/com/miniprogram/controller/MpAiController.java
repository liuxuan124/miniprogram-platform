package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.AiChatDTO;
import com.miniprogram.dto.AiChatVO;
import com.miniprogram.dto.AiRecommendationLogDTO;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.AiConversationService;
import com.miniprogram.service.AiRecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 小程序端AI对话控制器
 *
 * 契约接口:
 * - POST /api/v1/mp/ai/chat               — AI对话（登录）
 * - GET  /api/v1/mp/ai/history             — 对话历史（登录）
 * - POST /api/v1/mp/ai/recommendation-logs — 记录推荐点击（登录）
 */
@Tag(name = "小程序-AI对话", description = "AI智能推荐对话、对话历史、推荐点击")
@RestController
@RequestMapping("/api/v1/mp/ai")
@RequiredArgsConstructor
public class MpAiController {

    private final AiConversationService conversationService;
    private final AiRecommendationService recommendationService;

    @Operation(summary = "AI对话", description = "用户提问，AI推荐商品/内容/活动")
    @PostMapping("/chat")
    public R<AiChatVO> chat(@Valid @RequestBody AiChatDTO chatDTO) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        return R.ok(conversationService.chat(userId, chatDTO));
    }

    @Operation(summary = "对话历史", description = "获取当前用户的AI对话历史")
    @GetMapping("/history")
    public R<PageResult<AiChatVO>> getHistory(
            @RequestParam(required = false) String sessionId,
            @RequestParam(defaultValue = "1") Long current,
            @RequestParam(defaultValue = "10") Long size) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        return R.ok(conversationService.getHistory(userId, sessionId, current, size));
    }

    @Operation(summary = "记录推荐点击", description = "记录用户点击推荐项的行为")
    @PostMapping("/recommendation-logs")
    public R<Void> recordClick(@Valid @RequestBody AiRecommendationLogDTO logDTO) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        recommendationService.recordClick(userId, logDTO);
        return R.ok();
    }
}
