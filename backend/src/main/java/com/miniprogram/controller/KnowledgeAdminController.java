package com.miniprogram.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.R;
import com.miniprogram.entity.AgentKnowledge;
import com.miniprogram.entity.AgentKnowledgeChunk;
import com.miniprogram.entity.KnowledgeLibrary;
import com.miniprogram.mapper.AgentKnowledgeChunkMapper;
import com.miniprogram.mapper.AgentKnowledgeMapper;
import com.miniprogram.mapper.KnowledgeLibraryMapper;
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
@Tag(name = "后台-AI 语料库")
public class KnowledgeAdminController {

    private static final String PROTECTED_DIR = "protected/knowledge";

    private final AgentKnowledgeMapper agentKnowledgeMapper;
    private final AgentKnowledgeChunkMapper chunkMapper;
    private final KnowledgeIngestService knowledgeIngestService;
    private final KnowledgeRetrievalService knowledgeRetrievalService;
    private final KnowledgeSyncService knowledgeSyncService;
    private final KnowledgeLibraryMapper knowledgeLibraryMapper;
    private final FileUploadService fileUploadService;

    @Value("${file.upload.dir:./uploads}")
    private String uploadDir;

    @GetMapping("/stats")
    @Operation(summary = "语料库概览统计")
    public R<Map<String, Object>> stats() {
        long sources = agentKnowledgeMapper.selectCount(null);
        long chunks = chunkMapper.selectCount(new LambdaQueryWrapper<AgentKnowledgeChunk>().eq(AgentKnowledgeChunk::getStatus, 1));
        long indexed = agentKnowledgeMapper.selectCount(new LambdaQueryWrapper<AgentKnowledge>()
                .eq(AgentKnowledge::getVectorStatus, "done"));
        Map<String, Object> m = new HashMap<>();
        m.put("sourceCount", sources);
        m.put("chunkCount", chunks);
        m.put("indexedCount", indexed);
        m.put("indexPercent", sources > 0 ? Math.min(100, (int) (indexed * 100 / sources)) : 0);
        return R.ok(m);
    }

    @GetMapping
    @Operation(summary = "语料源列表")
    public R<List<Map<String, Object>>> list(@RequestParam(required = false) String sourceType,
                                             @RequestParam(required = false) Long libraryId) {
        LambdaQueryWrapper<AgentKnowledge> w = new LambdaQueryWrapper<AgentKnowledge>()
                .orderByDesc(AgentKnowledge::getCreatedAt);
        if (StringUtils.hasText(sourceType)) {
            w.eq(AgentKnowledge::getSourceType, sourceType);
        }
        if (libraryId != null) {
            w.eq(AgentKnowledge::getLibraryId, libraryId);
        }
        List<AgentKnowledge> list = agentKnowledgeMapper.selectList(w);
        List<Map<String, Object>> rows = list.stream().map(k -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", k.getId());
            m.put("libraryId", k.getLibraryId());
            m.put("fileName", k.getFileName());
            m.put("sourceType", k.getSourceType());
            m.put("sourceId", k.getSourceId());
            m.put("vectorStatus", k.getVectorStatus());
            m.put("statusMessage", k.getStatusMessage());
            m.put("recallWeight", k.getRecallWeight());
            m.put("citePolicy", StringUtils.hasText(k.getCitePolicy()) ? k.getCitePolicy() : "full");
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
    @Operation(summary = "上传语料文件")
    public R<AgentKnowledge> upload(@RequestPart("file") MultipartFile file,
                                    @RequestParam(required = false) Long configId,
                                    @RequestParam(required = false) Long libraryId,
                                    @RequestParam(required = false) String citePolicy) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "请选择文件");
        }
        String name = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase(Locale.ROOT) : "";
        if (name.endsWith(".pdf")) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "暂不支持 PDF，请转成 Word(.docx) 或 Markdown");
        }
        UploadResultVO uploaded = fileUploadService.upload(file, PROTECTED_DIR);
        Long libId = resolveLibraryId(libraryId);
        AgentKnowledge k = new AgentKnowledge();
        k.setConfigId(configId);
        k.setLibraryId(libId);
        k.setSourceType("file");
        k.setFileName(StringUtils.hasText(uploaded.getOriginalFileName())
                ? uploaded.getOriginalFileName() : file.getOriginalFilename());
        k.setFileSize(uploaded.getFileSize() != null ? uploaded.getFileSize() : file.getSize());
        k.setFileUrl(uploaded.getUrl());
        k.setVectorStatus("pending");
        k.setRecallWeight(BigDecimal.ONE);
        k.setCitePolicy(normalizeCitePolicy(citePolicy != null ? citePolicy : defaultCite(libId)));
        k.setChunkCount(0);
        k.setCreatedAt(LocalDateTime.now());
        agentKnowledgeMapper.insert(k);
        knowledgeIngestService.ingestAsync(k.getId());
        return R.ok(k);
    }

    @PostMapping("/crawl-url")
    @Operation(summary = "抓取外部链接入库（实用版：抓标题与正文文本）")
    public R<AgentKnowledge> crawlUrl(@RequestBody Map<String, Object> body) {
        String url = body == null ? null : String.valueOf(body.getOrDefault("url", "")).trim();
        if (!StringUtils.hasText(url) || !(url.startsWith("http://") || url.startsWith("https://"))) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "请填写 http(s) 链接");
        }
        Long libId = resolveLibraryId(body != null && body.get("libraryId") != null
                ? Long.valueOf(String.valueOf(body.get("libraryId"))) : null);
        String cite = body != null && body.get("citePolicy") != null
                ? String.valueOf(body.get("citePolicy")) : defaultCite(libId);
        try {
            org.jsoup.nodes.Document doc = org.jsoup.Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (compatible; KnowledgeBot/1.0)")
                    .timeout(15000)
                    .followRedirects(true)
                    .get();
            String title = StringUtils.hasText(doc.title()) ? doc.title().trim() : url;
            doc.select("script,style,nav,footer,iframe,noscript").remove();
            String text = doc.body() != null ? doc.body().text() : doc.text();
            if (!StringUtils.hasText(text) || text.length() < 20) {
                throw new BusinessException(ErrorCode.PARAM_ERROR, "未能从页面提取到有效正文");
            }
            if (text.length() > 80000) {
                text = text.substring(0, 80000);
            }
            AgentKnowledge k = new AgentKnowledge();
            k.setLibraryId(libId);
            k.setSourceType("url");
            k.setFileName(title.length() > 80 ? title.substring(0, 80) + "…" : title);
            k.setFileSize((long) text.length());
            k.setFileUrl(url);
            k.setVectorStatus("pending");
            k.setRecallWeight(BigDecimal.ONE);
            k.setCitePolicy(normalizeCitePolicy(cite));
            k.setCreatedAt(LocalDateTime.now());
            agentKnowledgeMapper.insert(k);
            knowledgeIngestService.ingestPlainText(k, title, text, url);
            return R.ok(k);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("crawl url failed: {}", e.getMessage());
            throw new BusinessException(ErrorCode.PARAM_ERROR, "抓取失败：" + e.getMessage());
        }
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
        Object libObj = body.get("libraryId");
        Long libId = resolveLibraryId(libObj == null ? null : Long.valueOf(String.valueOf(libObj)));
        k.setLibraryId(libId);
        k.setSourceType("manual");
        k.setFileName(question.length() > 40 ? question.substring(0, 40) + "…" : question);
        k.setFileSize(0L);
        k.setFileUrl("manual://qa");
        k.setVectorStatus("pending");
        Object weight = body.get("recallWeight");
        k.setRecallWeight(weight == null ? BigDecimal.ONE : new BigDecimal(String.valueOf(weight)));
        Object cite = body.get("citePolicy");
        k.setCitePolicy(normalizeCitePolicy(cite == null ? defaultCite(libId) : String.valueOf(cite)));
        k.setCreatedAt(LocalDateTime.now());
        agentKnowledgeMapper.insert(k);
        knowledgeIngestService.ingestQaPair(k, question, answer, "manual:" + k.getId());
        return R.ok(k);
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新语料源（引用策略等）")
    public R<AgentKnowledge> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        AgentKnowledge k = agentKnowledgeMapper.selectById(id);
        if (k == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "语料源不存在");
        }
        if (body != null && body.containsKey("citePolicy")) {
            k.setCitePolicy(normalizeCitePolicy(String.valueOf(body.get("citePolicy"))));
        }
        if (body != null && body.containsKey("recallWeight") && body.get("recallWeight") != null) {
            k.setRecallWeight(new BigDecimal(String.valueOf(body.get("recallWeight"))));
        }
        agentKnowledgeMapper.updateById(k);
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
        Long libraryId = null;
        if (body != null && body.get("libraryId") != null) {
            libraryId = Long.valueOf(String.valueOf(body.get("libraryId")));
        }
        return R.ok(knowledgeSyncService.sync(includeContent, includeQa, categoryIds, libraryId));
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

    private String normalizeCitePolicy(String raw) {
        if (!StringUtils.hasText(raw)) return "full";
        String v = raw.trim().toLowerCase(Locale.ROOT);
        if ("summary".equals(v) || "none".equals(v) || "full".equals(v)) {
            return v;
        }
        return "full";
    }
}
