package com.miniprogram.service;

import lombok.Getter;

/**
 * 买家发起新咨询事件。
 *
 * <p><b>为什么要用事件而不是直接调 OperatorNoticeService</b>：
 * 告警侧要通过 {@link ImEventPublisher} 反向把 SSE 事件推给座席，而
 * {@code ImService} 也需要触发告警 —— 直接方法调用会形成
 * {@code ImService ⇄ OperatorNoticeService} 构造器循环依赖。
 * Spring Boot 3 默认 {@code allow-circular-references=false}，启动会直接失败。
 * 走事件后依赖方向单向：{@code ImService} 只发布，{@code OperatorNoticeService} 只监听。
 */
@Getter
public class ImNewConversationEvent {

    private final Long conversationId;
    private final Long userId;
    private final String source;

    public ImNewConversationEvent(Long conversationId, Long userId, String source) {
        this.conversationId = conversationId;
        this.userId = userId;
        this.source = source;
    }
}
