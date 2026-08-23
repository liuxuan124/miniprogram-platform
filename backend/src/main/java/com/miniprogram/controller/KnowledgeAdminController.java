package com.miniprogram.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.R;
import com.miniprogram.entity.AgentKnowledge;
import com.miniprogram.entity.AgentKnowledgeChunk;
import com.miniprogram.mapper.AgentKnowledgeChunkMapper;
import com.miniprogram.mapper.AgentKnowledgeMapper;
import com.miniprogram.service.FileUploadService;
import com.miniprogram.service.knowledge.KnowledgeIngestService;
import com.miniprogram.service.knowledge.KnowledgeRetrievalService;
import com.miniprogram.service.knowledge.KnowledgeSyncService;
import com.miniprogram.dto.system.UploadResultVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin/knowledge")
@RequiredArgsConstructor
@Tag(name = "后台-知识库管理")
public class KnowledgeAdminController {

    private static final String PROTECTED_DIR = "protected/knowledge";

    private final AgentKnowledgeMapper agentKnowledgeMapper;
    private final AgentKnowledgeChunkMapper chunkMapper;
    private final KnowledgeIngestService knowledgeIngestService;
    private final KnowledgeRetrievalService knowledgeRetrievalService;
    private final KnowledgeSyncService knowledgeSyncService;
    private final FileUploadService fileUploadService;

    @Value("${file.upload.dir:./uploads}")
    private String uploadDir;

    @GetMapping
    @Operation(summary = "知识源列表")
    public R<List<Map<String, Object>>> list(@RequestParam(required = false) String sourceType) {
        LambdaQueryWrapper<AgentKnowledge> w = new LambdaQueryWrapper<AgentKnowledge>()
                .orderByDesc(AgentKnowledge::getCreatedAt);
        if (StringUtils.hasText(sourceType)) {
            w.eq(AgentKnowledge::getSourceType, sourceType);
        }
        List<AgentKnowledge> list = agentKnowledgeMapper.selectList(w);
        List<Map<String, Object>> rows = list.stream().map(k -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", k.getId());
            m.put("fileName", k.getFileName());
            m.put("sourceType", k.getSourceType());
            m.put("sourceId", k.getSourceId());
            m.put("vectorStatus", k.getVectorStatus());
            m.put("statusMessage", k.getStatusMessage());
            m.put("recallWeight", k.getRecallWeight());
            m.put("chunkCount", k.getChunkCount());
            m.put("fileSize", k.getFileSize());
            m.put("fileUrl", k.getFileUrl());
            m.put("createdAt", k.getCreatedAt());
            m.put("lastSyncedAt", k.getLastSyncedAt());
            Long hits = chunkMapper.selectList(new LambdaQueryWrapper<AgentKnowledgeChunk>()
                            .eq(AgentKnowledgeChunk::getKnowledgeId, k.getId()))
                    .stream()
                    .mapToLong(c -> c.getHitCount() == null ? 0 : c.getHitCount())
                    .sum();
            m.put("hitCount", hits);
            return m;
        }).collect(Collectors.toList());
        return R.ok(rows);
    }

    @GetMapping("/search")
    @Operation(summary = "检索测试（不调模型）")
    public R<List<Map<String, Object>>> search(@RequestParam String q,
                                               @RequestParam(required = false) Long configId) {
        List<Map<String, Object>> hits = knowledgeRetrievalService.retrieve(configId, q, 5);
        List<Map<String, Object>> mapped = hits.stream().map(h -> {
            Map<String, Object> m = new HashMap<>();
            m.put("chunkId", h.get("id"));
            m.put("title", h.get("title"));
            m.put("body", h.get("body"));
            m.put("sourceRef", h.get("sourceRef"));
            m.put("score", h.get("score"));
            return m;
        }).collect(Collectors.toList());
        return R.ok(mapped);
    }

    @GetMapping("/{id}/chunks")
    @Operation(summary = "切片列表")
    public R<List<AgentKnowledgeChunk>> chunks(@PathVariable Long id) {
        return R.ok(chunkMapper.selectList(new LambdaQueryWrapper<AgentKnowledgeChunk>()
                .eq(AgentKnowledgeChunk::getKnowledgeId, id)
                .orderByAsc(AgentKnowledgeChunk::getSeq)));
    }

    @DeleteMapping("/chunks/{chunkId}")
    @Operation(summary = "删除切片")
    public R<Void> deleteChunk(@PathVariable Long chunkId) {
        chunkMapper.deleteById(chunkId);
        return R.ok();
    }

    @PostMapping("/upload")
    @Operation(summary = "上传知识文件")
    public R<AgentKnowledge> upload(@RequestPart("file") MultipartFile file,
                                    @RequestParam(required = false) Long configId) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "请选择文件");
        }
        String name = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase(Locale.ROOT) : "";
        if (name.endsWith(".pdf")) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "暂不支持 PDF，请转成 Word(.docx) 或 Markdown");
        }
        UploadResultVO uploaded = fileUploadService.upload(file, PROTECTED_DIR);
        AgentKnowledge k = new AgentKnowledge();
        k.setConfigId(configId);
        k.setSourceType("file");
        k.setFileName(StringUtils.hasText(uploaded.getOriginalFileName())
                ? uploaded.getOriginalFileName() : file.getOriginalFilename());
        k.setFileSize(uploaded.getFileSize() != null ? uploaded.getFileSize() : file.getSize());
        k.setFileUrl(uploaded.getUrl());
        k.setVectorStatus("pending");
        k.setRecallWeight(BigDecimal.ONE);
        k.setChunkCount(0);
        k.setCreatedAt(LocalDateTime.now());
        agentKnowledgeMapper.insert(k);
        knowledgeIngestService.ingestAsync(k.getId());
        return R.ok(k);
    }

    @PostMapping("/manual-qa")
    @Operation(summary = "手动录入问答")
    public R<AgentKnowledge> manualQa(@RequestBody Map<String, Object> body) {
        String question = body == null ? null : String.valueOf(body.getOrDefault("question", "")).trim();
        String answer = body == null ? null : String.valueOf(body.getOrDefault("answer", "")).trim();
        if (!StringUtils.hasText(question) || !StringUtils.hasText(answer)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "问题与答案不能为空");
        }
        AgentKnowledge k = new AgentKnowledge();
        k.setSourceType("manual");
        k.setFileName(question.length() > 40 ? question.substring(0, 40) + "…" : question);
        k.setFileSize(0L);
        k.setFileUrl("manual://qa");
        k.setVectorStatus("pending");
        Object weight = body.get("recallWeight");
        k.setRecallWeight(weight == null ? BigDecimal.ONE : new BigDecimal(String.valueOf(weight)));
        k.setCreatedAt(LocalDateTime.now());
        agentKnowledgeMapper.insert(k);
        knowledgeIngestService.ingestQaPair(k, question, answer, "manual:" + k.getId());
        return R.ok(k);
    }

    @PostMapping("/sync-content")
    @Operation(summary = "从内容库同步")
    public R<Map<String, Object>> syncContent(@RequestBody(required = false) Map<String, Object> body) {
        boolean includeContent = body == null
                || !body.containsKey("includePublishedContent")
                || Boolean.TRUE.equals(body.get("includePublishedContent"));
        boolean includeQa = body != null && Boolean.TRUE.equals(body.get("includeAnsweredQa"));
        List<Long> categoryIds = null;
        if (body != null && body.get("categoryIds") instanceof List<?> list) {
            categoryIds = list.stream().map(o -> Long.valueOf(String.valueOf(o))).toList();
        }
        return R.ok(knowledgeSyncService.sync(includeContent, includeQa, categoryIds));
    }

    @GetMapping("/{id}/download")
    @Operation(summary = "鉴权下载知识文件")
    public void download(@PathVariable Long id, HttpServletResponse response) throws Exception {
        AgentKnowledge k = agentKnowledgeMapper.selectById(id);
        if (k == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "知识源不存在");
        }
        Path path = resolvePath(k.getFileUrl());
        if (path == null || !Files.exists(path)) {
            throw new BusinessException(ErrorCode.FILE_NOT_FOUND);
        }
        response.setContentType("application/octet-stream");
        response.setHeader("Content-Disposition",
                "attachment; filename=\"" + (k.getFileName() != null ? k.getFileName() : "knowledge") + "\"");
        try (InputStream in = Files.newInputStream(path); OutputStream out = response.getOutputStream()) {
            in.transferTo(out);
        }
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除知识源")
    public R<Void> delete(@PathVariable Long id) {
        chunkMapper.delete(new LambdaQueryWrapper<AgentKnowledgeChunk>()
                .eq(AgentKnowledgeChunk::getKnowledgeId, id));
        agentKnowledgeMapper.deleteById(id);
        return R.ok();
    }

    @PostMapping("/{id}/reingest")
    @Operation(summary = "重新解析切片")
    public R<Void> reingest(@PathVariable Long id) {
        knowledgeIngestService.ingestAsync(id);
        return R.ok();
    }

    private Path resolvePath(String fileUrl) {
        if (!StringUtils.hasText(fileUrl)) return null;
        String url = fileUrl.trim();
        int idx = url.indexOf("/uploads/");
        if (idx >= 0) {
            return Paths.get(uploadDir).resolve(url.substring(idx + "/uploads/".length())).normalize();
        }
        return null;
    }
}
