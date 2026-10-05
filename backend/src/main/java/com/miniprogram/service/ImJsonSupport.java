package com.miniprogram.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;

/**
 * JSON 读写工具。
 *
 * <p><b>为什么单独抽出来</b>：{@code ImService} 与 {@code OperatorNoticeService} 需要互相
 * 调用（IM 推新咨询告警 → 告警要通过 SSE 推给座席），若都用对方做 JSON 工具会形成
 * <b>构造器循环依赖</b>。Spring Boot 3 默认 {@code allow-circular-references=false}，
 * 启动会直接失败。把工具抽到中立组件后，依赖方向是单向的：
 * <pre>
 *   ImService ──┐
 *               ├─→ ImJsonSupport
 *   OperatorNoticeService ─┘
 * </pre>
 */
@Component
@RequiredArgsConstructor
public class ImJsonSupport {

    private final ObjectMapper objectMapper;

    public Map<String, Object> readMap(String json) {
        if (!StringUtils.hasText(json)) {
            return null;
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return null;
        }
    }

    public <T> List<T> readList(String json) {
        if (!StringUtils.hasText(json)) {
            return null;
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<T>>() {});
        } catch (Exception e) {
            return null;
        }
    }

    public String write(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return "{}";
        }
    }

    /** 写 Map，失败返回 null（调用方据此判断「这条消息降级为纯文本」）。 */
    public String writeMapOrNull(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return null;
        }
    }
}
