package com.miniprogram.service.knowledge;

import com.miniprogram.mapper.AgentKnowledgeChunkMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 知识库全文检索（MySQL ngram）
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KnowledgeRetrievalService {

    public static final int DEFAULT_TOP_K = 4;
    public static final int MAX_CHARS = 3500;

    private final AgentKnowledgeChunkMapper chunkMapper;

    public List<Map<String, Object>> retrieve(Long configId, String question, int topK) {
        if (!StringUtils.hasText(question)) {
            return List.of();
        }
        int limit = topK > 0 ? Math.min(topK, 10) : DEFAULT_TOP_K;
        try {
            List<Map<String, Object>> rows = chunkMapper.searchFullText(question.trim(), configId, limit);
            if (rows == null) {
                return List.of();
            }
            List<Map<String, Object>> clipped = new ArrayList<>();
            int used = 0;
            for (Map<String, Object> row : rows) {
                String body = String.valueOf(row.getOrDefault("body", ""));
                if (used + body.length() > MAX_CHARS && !clipped.isEmpty()) {
                    break;
                }
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", row.get("id"));
                item.put("title", row.get("title"));
                item.put("body", body);
                item.put("sourceRef", row.get("sourceRef"));
                item.put("score", row.get("score"));
                clipped.add(item);
                used += body.length();
                Object id = row.get("id");
                if (id != null) {
                    incrHitAsync(Long.valueOf(String.valueOf(id)));
                }
            }
            return clipped;
        } catch (Exception e) {
            log.warn("knowledge retrieve failed: {}", e.getMessage());
            return List.of();
        }
    }

    public String buildContextBlock(List<Map<String, Object>> sources) {
        if (sources == null || sources.isEmpty()) {
            return """
                    【参考资料】当前知识库中未检索到相关资料。
                    若问题无法仅凭通用知识可靠回答，请明确告知用户「不确定」并建议转人工，禁止编造。
                    """;
        }
        StringBuilder sb = new StringBuilder();
        sb.append("【参考资料】（回答必须依据以下资料，资料中没有的信息请说明你不确定）\n");
        int i = 1;
        for (Map<String, Object> s : sources) {
            sb.append('[').append(i++).append("] ")
                    .append(s.getOrDefault("title", ""))
                    .append("：")
                    .append(s.getOrDefault("body", ""))
                    .append('\n');
        }
        sb.append("回答末尾用 [1][2] 标注引用来源。");
        return sb.toString();
    }

    @Async("importExecutor")
    public void incrHitAsync(Long chunkId) {
        try {
            chunkMapper.incrHitCount(chunkId);
        } catch (Exception e) {
            log.debug("incr hit failed: {}", e.getMessage());
        }
    }
}
