package com.miniprogram.service;

import com.miniprogram.entity.AiConversation;
import lombok.Data;

import java.util.List;

/**
 * AI客户端服务 — 调用外部AI API（讯飞星火/OpenAI兼容接口）
 */
public interface AiClientService {

    /**
     * 调用AI获取推荐
     *
     * @param question  用户提问
     * @param sessionId 会话ID
     * @param history   对话历史（用于上下文）
     * @return AI响应
     */
    AiResponse chat(String question, String sessionId, List<AiConversation> history);

    /**
     * AI响应结果
     */
    @Data
    class AiResponse {
        /**
         * AI回答文字
         */
        private String answer;

        /**
         * 是否需要转人工
         */
        private boolean transferHuman;

        /**
         * AI原始返回内容（用于日志）
         */
        private String rawContent;
    }
}
