package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.AiRecommendationLogDTO;
import com.miniprogram.dto.AiRecommendationLogQueryDTO;
import com.miniprogram.dto.AiStatsVO;
import com.miniprogram.entity.AiRecommendationLog;
import com.miniprogram.entity.AiConversation;

/**
 * 推荐日志 Service
 */
public interface AiRecommendationService {

    /**
     * 记录推荐点击（小程序端）
     *
     * @param userId 用户ID
     * @param logDTO 点击记录请求
     */
    void recordClick(Long userId, AiRecommendationLogDTO logDTO);

    /**
     * 批量保存推荐日志（内部使用，对话时自动记录）
     *
     * @param conversationId 对话ID
     * @param userId         用户ID
     * @param items          推荐项列表
     */
    void batchSaveRecommendationLogs(Long conversationId, Long userId, java.util.List<AiConversation.RecommendedItem> items);

    /**
     * 推荐日志列表（后台管理）
     *
     * @param queryDTO 查询参数
     * @return 推荐日志列表
     */
    PageResult<AiRecommendationLog> listRecommendationLogs(AiRecommendationLogQueryDTO queryDTO);

    /**
     * 推荐统计（后台管理）
     *
     * @param startTime 开始时间
     * @param endTime   结束时间
     * @return 统计数据
     */
    AiStatsVO getStats(String startTime, String endTime);
    /**
     * AI推荐
     */
    Object recommend(String userOpenId, String category, int limit);
}
