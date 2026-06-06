package com.miniprogram.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.entity.AiConversation;
import com.miniprogram.service.AiClientService;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * AI客户端服务实现 — 支持讯飞星火和OpenAI兼容接口
 * <p>
 * 配置项:
 * - ai.api.url: AI服务API地址
 * - ai.api.key: AI服务API密钥
 * - ai.model: 模型名称
 * - ai.api.timeout: 超时时间(ms)，默认10000
 */
@Slf4j
@Service
public class AiClientServiceImpl implements AiClientService {

    @Value("${ai.api.url:}")
    private String apiUrl;

    @Value("${ai.api.key:}")
    private String apiKey;

    @Value("${ai.model:gpt-3.5-turbo}")
    private String model;

    @Value("${ai.api.timeout:10000}")
    private int timeout;

    @Value("${ai.prompt.system:你是一个小程序智能推荐助手，根据用户的问题推荐合适的商品、内容或活动。}")
    private String systemPrompt;

    @Value("${ai.transfer.keywords:转人工,人工客服,联系客服,投诉,退款问题,售后}")
    private String transferKeywords;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public AiClientServiceImpl(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public AiResponse chat(String question, String sessionId, List<AiConversation> history) {
        AiResponse response = new AiResponse();

        // 检查是否需要转人工
        if (shouldTransferToHuman(question)) {
            response.setAnswer("好的，正在为您转接人工客服，请稍候...");
            response.setTransferHuman(true);
            response.setRawContent("TRANSFER_HUMAN_DETECTED");
            return response;
        }

        // 如果未配置AI API，降级返回默认推荐
        if (apiUrl == null || apiUrl.isBlank()) {
            log.warn("AI API URL未配置，返回降级推荐");
            return buildFallbackResponse(question);
        }

        try {
            return callAiApi(question, sessionId, history);
        } catch (Exception e) {
            log.error("调用AI API失败，降级返回默认推荐: {}", e.getMessage(), e);
            return buildFallbackResponse(question);
        }
    }

    /**
     * 检测是否需要转人工
     */
    private boolean shouldTransferToHuman(String question) {
        if (transferKeywords == null || transferKeywords.isBlank()) {
            return false;
        }
        String[] keywords = transferKeywords.split(",");
        for (String keyword : keywords) {
            if (question.contains(keyword.trim())) {
                return true;
            }
        }
        return false;
    }

    /**
     * 调用AI API（OpenAI兼容格式）
     */
    private AiResponse callAiApi(String question, String sessionId, List<AiConversation> history) {
        try {
            // 构建消息列表
            List<Map<String, String>> messages = new ArrayList<>();

            // 系统提示
            Map<String, String> systemMsg = new HashMap<>();
            systemMsg.put("role", "system");
            systemMsg.put("content", systemPrompt);
            messages.add(systemMsg);

            // 历史对话（最近10轮）
            int startIdx = Math.max(0, history.size() - 10);
            for (int i = startIdx; i < history.size(); i++) {
                AiConversation conv = history.get(i);
                Map<String, String> userMsg = new HashMap<>();
                userMsg.put("role", "user");
                userMsg.put("content", conv.getQuestion());
                messages.add(userMsg);

                Map<String, String> assistantMsg = new HashMap<>();
                assistantMsg.put("role", "assistant");
                assistantMsg.put("content", conv.getAnswer() != null ? conv.getAnswer() : "");
                messages.add(assistantMsg);
            }

            // 当前提问
            Map<String, String> currentMsg = new HashMap<>();
            currentMsg.put("role", "user");
            currentMsg.put("content", question);
            messages.add(currentMsg);

            // 构建请求体
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("messages", messages);
            requestBody.put("temperature", 0.7);
            requestBody.put("max_tokens", 1000);

            // 设置请求头
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (apiKey != null && !apiKey.isBlank()) {
                headers.setBearerAuth(apiKey);
            }

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            // 发送请求
            ResponseEntity<String> responseEntity = restTemplate.exchange(
                    apiUrl, HttpMethod.POST, entity, String.class
            );

            String responseBody = responseEntity.getBody();
            log.info("AI API响应: {}", responseBody);

            // 解析响应
            AiResponse response = new AiResponse();
            response.setRawContent(responseBody);

            if (responseBody != null) {
                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode choices = root.get("choices");
                if (choices != null && choices.isArray() && !choices.isEmpty()) {
                    JsonNode message = choices.get(0).get("message");
                    if (message != null) {
                        String content = message.get("content") != null ? message.get("content").asText() : "";
                        response.setAnswer(content);

                        // 检测AI返回中是否包含转人工标记
                        if (content.contains("[转人工]") || content.contains("[TRANSFER_HUMAN]")) {
                            response.setTransferHuman(true);
                            response.setAnswer(content.replace("[转人工]", "").replace("[TRANSFER_HUMAN]", "").trim());
                        }
                    }
                }
            }

            if (response.getAnswer() == null || response.getAnswer().isBlank()) {
                response.setAnswer("抱歉，我暂时无法回答您的问题，请稍后再试。");
            }

            return response;
        } catch (Exception e) {
            log.error("解析AI API响应失败: {}", e.getMessage(), e);
            throw new RuntimeException("AI服务响应解析失败", e);
        }
    }

    /**
     * 降级响应 — 当AI API不可用时返回默认推荐
     */
    private AiResponse buildFallbackResponse(String question) {
        AiResponse response = new AiResponse();
        response.setAnswer("根据您的需求，为您推荐以下热门内容。如需更精准的推荐，请详细描述您的需求。");
        response.setTransferHuman(false);
        response.setRawContent("FALLBACK_RESPONSE");
        return response;
    }
}
