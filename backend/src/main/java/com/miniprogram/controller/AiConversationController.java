package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.AiConversationQueryDTO;
import com.miniprogram.dto.AiConversationVO;
import com.miniprogram.dto.AiRecommendationLogQueryDTO;
import com.miniprogram.dto.AiStatsVO;
import com.miniprogram.entity.AiRecommendationLog;
import com.miniprogram.service.AiConversationService;
import com.miniprogram.service.AiRecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * AI推荐管理控制器（后台管理）
 *
 * 契约接口:
 * - GET  /api/v1/admin/ai/conversations          — 对话列表
 * - GET  /api/v1/admin/ai/conversations/{id}      — 对话详情
 * - GET  /api/v1/admin/ai/recommendation-logs     — 推荐日志
 * - GET  /api/v1/admin/ai/stats                   — 推荐统计
 */
@Tag(name = "AI推荐管理", description = "AI对话列表、推荐日志、推荐统计")
@RestController
@RequestMapping("/api/v1/admin/ai")
@RequiredArgsConstructor
public class AiConversationController {

    private final AiConversationService conversationService;
    private final AiRecommendationService recommendationService;

    @Operation(summary = "对话列表", description = "分页查询AI对话列表")
    @GetMapping("/conversations")
    public R<PageResult<AiConversationVO>> listConversations(AiConversationQueryDTO queryDTO) {
        return R.ok(conversationService.listConversations(queryDTO));
    }

    @Operation(summary = "对话详情", description = "获取AI对话详情")
    @GetMapping("/conversations/{id}")
    public R<AiConversationVO> getConversationDetail(@PathVariable Long id) {
        return R.ok(conversationService.getConversationDetail(id));
    }

    @Operation(summary = "推荐日志", description = "分页查询推荐日志")
    @GetMapping("/recommendation-logs")
    public R<PageResult<AiRecommendationLog>> listRecommendationLogs(AiRecommendationLogQueryDTO queryDTO) {
        return R.ok(recommendationService.listRecommendationLogs(queryDTO));
    }

    @Operation(summary = "推荐统计", description = "获取AI推荐统计数据")
    @GetMapping("/stats")
    public R<AiStatsVO> getStats(
            @RequestParam(required = false) String startTime,
            @RequestParam(required = false) String endTime) {
        return R.ok(recommendationService.getStats(startTime, endTime));
    }
}
