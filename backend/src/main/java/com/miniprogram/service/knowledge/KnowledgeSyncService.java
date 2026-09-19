package com.miniprogram.service.knowledge;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.entity.AgentKnowledge;
import com.miniprogram.entity.Answer;
import com.miniprogram.entity.Content;
import com.miniprogram.entity.KnowledgeLibrary;
import com.miniprogram.entity.Question;
import com.miniprogram.mapper.AgentKnowledgeMapper;
import com.miniprogram.mapper.AnswerMapper;
import com.miniprogram.mapper.ContentMapper;
import com.miniprogram.mapper.KnowledgeLibraryMapper;
import com.miniprogram.mapper.QuestionMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 从内容库 / 问答库同步到知识库
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KnowledgeSyncService {

    private final ContentMapper contentMapper;
    private final QuestionMapper questionMapper;
    private final AnswerMapper answerMapper;
    private final AgentKnowledgeMapper agentKnowledgeMapper;
    private final KnowledgeIngestService knowledgeIngestService;
    private final KnowledgeLibraryMapper knowledgeLibraryMapper;

    public Map<String, Object> sync(boolean includeContent, boolean includeQa, List<Long> categoryIds) {
        return sync(includeContent, includeQa, categoryIds, null);
    }

    public Map<String, Object> sync(boolean includeContent, boolean includeQa, List<Long> categoryIds, Long libraryId) {
        Long libId = resolveLibraryId(libraryId);
        int synced = 0;
        int chunks = 0;
        if (includeContent) {
            LambdaQueryWrapper<Content> w = new LambdaQueryWrapper<Content>()
                    .eq(Content::getStatus, "published")
                    .orderByDesc(Content::getUpdateTime)
                    .last("LIMIT 500");
            if (categoryIds != null && !categoryIds.isEmpty()) {
                w.in(Content::getCategoryId, categoryIds);
            }
            List<Content> list = contentMapper.selectList(w);
            for (Content c : list) {
                if (upsertContent(c, libId)) {
                    synced++;
                    AgentKnowledge k = findContentKnowledge(c.getId());
                    chunks += k != null && k.getChunkCount() != null ? k.getChunkCount() : 0;
                }
            }
        }
        if (includeQa) {
            List<Question> questions = questionMapper.selectList(new LambdaQueryWrapper<Question>()
                    .eq(Question::getStatus, "answered")
                    .orderByDesc(Question::getUpdateTime)
                    .last("LIMIT 300"));
            for (Question q : questions) {
                Answer ans = answerMapper.selectOne(new LambdaQueryWrapper<Answer>()
                        .eq(Answer::getQuestionId, q.getId())
                        .orderByDesc(Answer::getCreateTime)
                        .last("LIMIT 1"));
                if (ans == null || !StringUtils.hasText(ans.getContent())) {
                    continue;
                }
                AgentKnowledge existing = agentKnowledgeMapper.selectOne(new LambdaQueryWrapper<AgentKnowledge>()
                        .eq(AgentKnowledge::getSourceType, "qa")
                        .eq(AgentKnowledge::getSourceId, q.getId())
                        .last("LIMIT 1"));
                AgentKnowledge k = existing != null ? existing : new AgentKnowledge();
                k.setLibraryId(libId);
                k.setSourceType("qa");
                k.setSourceId(q.getId());
                k.setFileName("问答#" + q.getId());
                k.setFileSize(0L);
                k.setFileUrl("qa://" + q.getId());
                k.setRecallWeight(new BigDecimal("1.2"));
                if (!StringUtils.hasText(k.getCitePolicy())) {
                    k.setCitePolicy(defaultCite(libId));
                }
                k.setCreatedAt(k.getCreatedAt() != null ? k.getCreatedAt() : LocalDateTime.now());
                if (k.getId() == null) {
                    agentKnowledgeMapper.insert(k);
                } else {
                    agentKnowledgeMapper.updateById(k);
                }
                knowledgeIngestService.ingestQaPair(k, q.getBody(), ans.getContent(), "qa:" + q.getId());
                synced++;
                chunks += 1;
            }
        }
        Map<String, Object> result = new HashMap<>();
        result.put("synced", synced);
        result.put("chunks", chunks);
        result.put("message", "同步完成：语料源 " + synced + "，切片约 " + chunks);
        return result;
    }

    /** 单篇内容发布后自动入库（尊重知识库「发布即入库」开关） */
    public boolean ingestPublishedContent(Content content) {
        if (content == null || content.getId() == null) {
            return false;
        }
        List<KnowledgeLibrary> libs = knowledgeLibraryMapper.selectList(new LambdaQueryWrapper<KnowledgeLibrary>()
                .eq(KnowledgeLibrary::getStatus, 1)
                .eq(KnowledgeLibrary::getAutoIngestOnPublish, 1));
        if (libs == null || libs.isEmpty()) {
            return false;
        }
        boolean any = false;
        for (KnowledgeLibrary lib : libs) {
            any |= upsertContent(content, lib.getId());
        }
        return any;
    }

    private boolean upsertContent(Content c, Long libId) {
        AgentKnowledge existing = agentKnowledgeMapper.selectOne(new LambdaQueryWrapper<AgentKnowledge>()
                .eq(AgentKnowledge::getSourceType, "content")
                .eq(AgentKnowledge::getSourceId, c.getId())
                .eq(AgentKnowledge::getLibraryId, libId)
                .last("LIMIT 1"));
        if (existing == null) {
            existing = agentKnowledgeMapper.selectOne(new LambdaQueryWrapper<AgentKnowledge>()
                    .eq(AgentKnowledge::getSourceType, "content")
                    .eq(AgentKnowledge::getSourceId, c.getId())
                    .and(w -> w.isNull(AgentKnowledge::getLibraryId).or().eq(AgentKnowledge::getLibraryId, 1L))
                    .last("LIMIT 1"));
        }
        boolean needRebuild = existing == null
                || existing.getLastSyncedAt() == null
                || (c.getUpdateTime() != null && c.getUpdateTime().isAfter(existing.getLastSyncedAt()));
        if (!needRebuild && existing != null && libId.equals(existing.getLibraryId())) {
            return false;
        }
        AgentKnowledge k = existing != null ? existing : new AgentKnowledge();
        k.setLibraryId(libId);
        k.setSourceType("content");
        k.setSourceId(c.getId());
        k.setFileName(c.getTitle());
        k.setFileSize(0L);
        k.setFileUrl("content://" + c.getId());
        k.setVectorStatus("processing");
        k.setRecallWeight(BigDecimal.ONE);
        if (!StringUtils.hasText(k.getCitePolicy())) {
            k.setCitePolicy(defaultCite(libId));
        }
        k.setCreatedAt(k.getCreatedAt() != null ? k.getCreatedAt() : LocalDateTime.now());
        if (k.getId() == null) {
            agentKnowledgeMapper.insert(k);
        } else {
            agentKnowledgeMapper.updateById(k);
        }
        String plain = Jsoup.parse(c.getContent() != null ? c.getContent() : "").text();
        if (StringUtils.hasText(c.getSummary())) {
            plain = c.getSummary() + "\n\n" + plain;
        }
        knowledgeIngestService.ingestPlainText(k, c.getTitle(), plain, "content:" + c.getId());
        return true;
    }

    private AgentKnowledge findContentKnowledge(Long contentId) {
        return agentKnowledgeMapper.selectOne(new LambdaQueryWrapper<AgentKnowledge>()
                .eq(AgentKnowledge::getSourceType, "content")
                .eq(AgentKnowledge::getSourceId, contentId)
                .last("LIMIT 1"));
    }

    private Long resolveLibraryId(Long libraryId) {
        if (libraryId != null && libraryId > 0) {
            return libraryId;
        }
        return 1L;
    }

    private String defaultCite(Long libraryId) {
        KnowledgeLibrary lib = knowledgeLibraryMapper.selectById(libraryId);
        if (lib != null && StringUtils.hasText(lib.getDefaultCitePolicy())) {
            return lib.getDefaultCitePolicy();
        }
        return "full";
    }
}
