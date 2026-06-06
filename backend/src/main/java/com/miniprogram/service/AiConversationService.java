package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.AiChatDTO;
import com.miniprogram.dto.AiChatVO;
import com.miniprogram.dto.AiConversationQueryDTO;
import com.miniprogram.dto.AiConversationVO;
import com.miniprogram.entity.AiConversation;

import java.util.List;

/**
 * AI对话 Service
 */
public interface AiConversationService {

    /**
     * AI对话（小程序端）
     *
     * @param userId  用户ID
     * @param chatDTO 对话请求
     * @return AI推荐响应
     */
    AiChatVO chat(Long userId, AiChatDTO chatDTO);

    /**
     * 获取对话历史（小程序端）
     *
     * @param userId    用户ID
     * @param sessionId 会话ID（可选）
     * @param current   页码
     * @param size      每页大小
     * @return 对话历史列表
     */
    PageResult<AiChatVO> getHistory(Long userId, String sessionId, Long current, Long size);

    /**
     * 对话列表（后台管理）
     *
     * @param queryDTO 查询参数
     * @return 对话列表
     */
    PageResult<AiConversationVO> listConversations(AiConversationQueryDTO queryDTO);

    /**
     * 对话详情（后台管理）
     *
     * @param id 对话ID
     * @return 对话详情
     */
    AiConversationVO getConversationDetail(Long id);

    /**
     * 获取会话历史（内部使用，供AI客户端构建上下文）
     *
     * @param sessionId 会话ID
     * @return 对话列表
     */
    List<AiConversation> getSessionHistory(String sessionId);
}
