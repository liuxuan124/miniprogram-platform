package com.miniprogram.job;

import com.miniprogram.service.ImEventBridgeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 客服超时未响应扫描。
 *
 * <p>需求场景 B 的一半：「人工客服超过 3 分钟未响应时」推运营告警。
 * 新咨询的即时告警由 {@code ImService.openConversation} 发事件触发（无需轮询），
 * 这里只补「长时间没人接」这一段 —— 那部分只能靠扫描发现。
 *
 * <p>每 2 分钟跑一次：太密会把同一个会话反复告警，太疏则失去了「及时」的意义。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ImStaleConversationJob {

    private final ImEventBridgeService imEventBridgeService;

    @Scheduled(cron = "0 */2 * * * ?")
    public void scanStaleConversations() {
        try {
            imEventBridgeService.scanStaleConversations();
        } catch (Exception e) {
            log.warn("扫描超时未响应会话异常: {}", e.getMessage());
        }
    }
}
