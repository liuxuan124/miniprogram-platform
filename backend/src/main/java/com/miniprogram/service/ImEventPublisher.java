package com.miniprogram.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

/**
 * SSE 连接管理与事件广播。
 *
 * <p><b>为什么独立于 {@code ImService}</b>：{@code OperatorNoticeService}（运营告警）
 * 也需要把事件推给座席，但若它注入 {@code ImService}，而 {@code ImService} 又要调用
 * {@code OperatorNoticeService} 发新咨询告警，就构成<b>构造器循环依赖</b> ——
 * Spring Boot 3 默认 {@code allow-circular-references=false}，启动会直接失败。
 * 把「连接管理 + 广播」抽到中立组件后，依赖方向是单向的。
 */
@Slf4j
@Component
public class ImEventPublisher {

    /** 座席 SSE 连接超时：0 = 永不超时，靠事件保活。实际存活由 Nginx 决定。 */
    private static final long SSE_TIMEOUT_MS = 30 * 60 * 1000L;

    /** agentId → 该座席的所有 SSE 连接（一个座席可开多标签页） */
    private final Map<Long, List<SseEmitter>> agentEmitters = new ConcurrentHashMap<>();
    private final AtomicLong eventIdSeq = new AtomicLong(0);

    public SseEmitter subscribe(Long agentId, Long lastEventId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        List<SseEmitter> list = agentEmitters.computeIfAbsent(agentId, k -> new CopyOnWriteArrayList<>());
        list.add(emitter);

        emitter.onCompletion(() -> remove(agentId, emitter));
        emitter.onTimeout(() -> {
            remove(agentId, emitter);
            emitter.complete();
        });
        emitter.onError(e -> remove(agentId, emitter));

        // 建连后先推 hello，让前端确认「已连上」并能立刻刷新列表
        try {
            emitter.send(SseEmitter.event()
                    .id(String.valueOf(lastEventId == null ? eventIdSeq.get() : lastEventId))
                    .name("hello")
                    .data(Map.of("agentId", agentId, "serverTime", System.currentTimeMillis())));
        } catch (IOException e) {
            remove(agentId, emitter);
        }
        return emitter;
    }

    /**
     * 推给指定座席；{@code agentId} 为 null 时广播给所有在线座席
     * （用于「新咨询」这类尚未分配座席的事件，让所有坐席红点实时出现）。
     */
    public void publish(Object agentIdRaw, Map<String, Object> payload) {
        if (agentIdRaw == null) {
            for (List<SseEmitter> list : agentEmitters.values()) {
                broadcast(list, payload);
            }
            return;
        }
        Long agentId;
        try {
            agentId = agentIdRaw instanceof Number n ? n.longValue() : Long.valueOf(String.valueOf(agentIdRaw));
        } catch (NumberFormatException e) {
            return;
        }
        broadcast(agentEmitters.get(agentId), payload);
    }

    /** 广播给所有在线座席。 */
    public void broadcastAll(Map<String, Object> payload) {
        for (List<SseEmitter> list : agentEmitters.values()) {
            broadcast(list, payload);
        }
    }

    private void broadcast(List<SseEmitter> list, Map<String, Object> payload) {
        if (list == null || list.isEmpty()) {
            return;
        }
        String eventName = String.valueOf(payload.getOrDefault("event", "message"));
        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event()
                        .id(String.valueOf(eventIdSeq.incrementAndGet()))
                        .name(eventName)
                        .data(payload));
            } catch (Exception e) {
                // 连接已断：从列表摘掉，避免每次推送都遍历坏连接
                try {
                    emitter.complete();
                } catch (Exception ignored) {
                    // 已断开，无需处理
                }
                removeByEmitter(list, emitter);
            }
        }
    }

    private void remove(Long agentId, SseEmitter emitter) {
        List<SseEmitter> list = agentEmitters.get(agentId);
        if (list == null) {
            return;
        }
        removeByEmitter(list, emitter);
        if (list.isEmpty()) {
            agentEmitters.remove(agentId);
        }
    }

    private void removeByEmitter(List<SseEmitter> list, SseEmitter emitter) {
        try {
            list.remove(emitter);
        } catch (Exception ignored) {
            // CopyOnWriteArrayList.remove 不会抛，兜底防御
        }
    }

    /** 构造运营告警事件体。 */
    public Map<String, Object> noticeEvent(String title, String content, String type) {
        Map<String, Object> evt = new LinkedHashMap<>();
        evt.put("event", "operator_notice");
        evt.put("title", title);
        evt.put("content", content);
        evt.put("type", type);
        return evt;
    }

    /** 当前在线座席数（用于状态栏展示）。 */
    public int onlineAgentCount() {
        return agentEmitters.size();
    }
}
