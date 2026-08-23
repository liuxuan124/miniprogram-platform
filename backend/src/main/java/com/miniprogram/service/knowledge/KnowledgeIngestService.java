package com.miniprogram.service.knowledge;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.entity.AgentKnowledge;
import com.miniprogram.entity.AgentKnowledgeChunk;
import com.miniprogram.mapper.AgentKnowledgeChunkMapper;
import com.miniprogram.mapper.AgentKnowledgeMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.jsoup.Jsoup;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 知识库解析与切片
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KnowledgeIngestService {

    private static final int CHUNK_MIN = 500;
    private static final int CHUNK_MAX = 800;
    private static final int OVERLAP = 100;
    private static final Pattern MD_HEADING = Pattern.compile("(?m)^(#{1,3})\\s+(.+)$");
    private static final Pattern HTML_HEADING = Pattern.compile("(?i)<h([1-3])[^>]*>(.*?)</h\\1>");

    private final AgentKnowledgeMapper agentKnowledgeMapper;
    private final AgentKnowledgeChunkMapper chunkMapper;

    @Value("${file.upload.dir:./uploads}")
    private String uploadDir;

    @Async("importExecutor")
    public void ingestAsync(Long knowledgeId) {
        ingest(knowledgeId);
    }

    public void ingest(Long knowledgeId) {
        AgentKnowledge k = agentKnowledgeMapper.selectById(knowledgeId);
        if (k == null) {
            return;
        }
        k.setVectorStatus("processing");
        k.setStatusMessage(null);
        agentKnowledgeMapper.updateById(k);
        try {
            String text = resolveText(k);
            if (!StringUtils.hasText(text)) {
                throw new BusinessException(ErrorCode.PARAM_ERROR, "未能解析出正文");
            }
            chunkMapper.delete(new LambdaQueryWrapper<AgentKnowledgeChunk>()
                    .eq(AgentKnowledgeChunk::getKnowledgeId, knowledgeId));
            List<AgentKnowledgeChunk> chunks = slice(text, k);
            for (AgentKnowledgeChunk c : chunks) {
                chunkMapper.insert(c);
            }
            k.setChunkCount(chunks.size());
            k.setVectorStatus("done");
            k.setStatusMessage(null);
            k.setLastSyncedAt(LocalDateTime.now());
            agentKnowledgeMapper.updateById(k);
            log.info("knowledge ingest done id={} chunks={}", knowledgeId, chunks.size());
        } catch (Exception e) {
            log.warn("knowledge ingest failed id={}: {}", knowledgeId, e.getMessage());
            k.setVectorStatus("failed");
            k.setStatusMessage(e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
            k.setChunkCount(0);
            agentKnowledgeMapper.updateById(k);
        }
    }

    public void ingestPlainText(AgentKnowledge k, String title, String body, String sourceRef) {
        chunkMapper.delete(new LambdaQueryWrapper<AgentKnowledgeChunk>()
                .eq(AgentKnowledgeChunk::getKnowledgeId, k.getId()));
        List<AgentKnowledgeChunk> chunks = slice(body, k);
        if (chunks.isEmpty() && StringUtils.hasText(body)) {
            AgentKnowledgeChunk c = new AgentKnowledgeChunk();
            c.setKnowledgeId(k.getId());
            c.setConfigId(k.getConfigId());
            c.setSeq(0);
            c.setTitle(title);
            c.setBody(body.trim());
            c.setCharLen(body.trim().length());
            c.setSourceRef(sourceRef);
            c.setHitCount(0);
            c.setStatus(1);
            c.setCreateTime(LocalDateTime.now());
            chunks.add(c);
        } else {
            for (AgentKnowledgeChunk c : chunks) {
                if (!StringUtils.hasText(c.getTitle())) {
                    c.setTitle(title);
                }
                if (!StringUtils.hasText(c.getSourceRef())) {
                    c.setSourceRef(sourceRef);
                }
            }
        }
        for (AgentKnowledgeChunk c : chunks) {
            chunkMapper.insert(c);
        }
        k.setChunkCount(chunks.size());
        k.setVectorStatus("done");
        k.setStatusMessage(null);
        k.setLastSyncedAt(LocalDateTime.now());
        agentKnowledgeMapper.updateById(k);
    }

    /** 问答对：单 chunk，不切片 */
    public void ingestQaPair(AgentKnowledge k, String question, String answer, String sourceRef) {
        chunkMapper.delete(new LambdaQueryWrapper<AgentKnowledgeChunk>()
                .eq(AgentKnowledgeChunk::getKnowledgeId, k.getId()));
        String body = "问：" + question + "\n答：" + answer;
        AgentKnowledgeChunk c = new AgentKnowledgeChunk();
        c.setKnowledgeId(k.getId());
        c.setConfigId(k.getConfigId());
        c.setSeq(0);
        c.setTitle(question.length() > 80 ? question.substring(0, 80) : question);
        c.setBody(body);
        c.setCharLen(body.length());
        c.setSourceRef(sourceRef);
        c.setHitCount(0);
        c.setStatus(1);
        c.setCreateTime(LocalDateTime.now());
        chunkMapper.insert(c);
        k.setChunkCount(1);
        k.setVectorStatus("done");
        k.setStatusMessage(null);
        k.setLastSyncedAt(LocalDateTime.now());
        agentKnowledgeMapper.updateById(k);
    }

    private String resolveText(AgentKnowledge k) throws Exception {
        String name = k.getFileName() != null ? k.getFileName().toLowerCase(Locale.ROOT) : "";
        if (name.endsWith(".pdf")) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "暂不支持 PDF，请转成 Word(.docx) 或 Markdown 后上传");
        }
        Path path = resolveLocalPath(k.getFileUrl());
        if (path == null || !Files.exists(path)) {
            // manual / 纯文本可能直接存 fileUrl 为内容占位
            if ("manual".equals(k.getSourceType()) && StringUtils.hasText(k.getFileUrl())
                    && !k.getFileUrl().startsWith("/") && !k.getFileUrl().startsWith("http")) {
                return k.getFileUrl();
            }
            throw new BusinessException(ErrorCode.FILE_NOT_FOUND, "知识文件不存在：" + k.getFileUrl());
        }
        if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".markdown") || name.endsWith(".csv")) {
            return Files.readString(path, StandardCharsets.UTF_8);
        }
        if (name.endsWith(".html") || name.endsWith(".htm")) {
            String html = Files.readString(path, StandardCharsets.UTF_8);
            return Jsoup.parse(html).text();
        }
        if (name.endsWith(".docx")) {
            try (InputStream in = Files.newInputStream(path); XWPFDocument doc = new XWPFDocument(in)) {
                StringBuilder sb = new StringBuilder();
                for (XWPFParagraph p : doc.getParagraphs()) {
                    String t = p.getText();
                    if (StringUtils.hasText(t)) {
                        sb.append(t).append('\n');
                    }
                }
                return sb.toString();
            }
        }
        if (name.endsWith(".xlsx")) {
            try (InputStream in = Files.newInputStream(path); Workbook wb = new XSSFWorkbook(in)) {
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < wb.getNumberOfSheets(); i++) {
                    Sheet sheet = wb.getSheetAt(i);
                    sb.append("# ").append(sheet.getSheetName()).append('\n');
                    for (Row row : sheet) {
                        List<String> cells = new ArrayList<>();
                        for (Cell cell : row) {
                            cells.add(cell.toString());
                        }
                        if (!cells.isEmpty()) {
                            sb.append(String.join("\t", cells)).append('\n');
                        }
                    }
                }
                return sb.toString();
            }
        }
        throw new BusinessException(ErrorCode.PARAM_ERROR, "不支持的文件类型：" + name);
    }

    private Path resolveLocalPath(String fileUrl) {
        if (!StringUtils.hasText(fileUrl)) {
            return null;
        }
        String url = fileUrl.trim();
        int idx = url.indexOf("/uploads/");
        if (idx >= 0) {
            String relative = url.substring(idx + "/uploads/".length());
            return Paths.get(uploadDir).resolve(relative).normalize();
        }
        if (url.startsWith("protected/") || !url.startsWith("http")) {
            return Paths.get(uploadDir).resolve(url).normalize();
        }
        return null;
    }

    private List<AgentKnowledgeChunk> slice(String raw, AgentKnowledge k) {
        String text = raw.replace("\r\n", "\n").trim();
        List<Section> sections = splitByHeadings(text);
        List<AgentKnowledgeChunk> result = new ArrayList<>();
        int seq = 0;
        for (Section section : sections) {
            List<String> pieces = packParagraphs(section.body);
            for (String piece : pieces) {
                if (!StringUtils.hasText(piece)) continue;
                AgentKnowledgeChunk c = new AgentKnowledgeChunk();
                c.setKnowledgeId(k.getId());
                c.setConfigId(k.getConfigId());
                c.setSeq(seq++);
                c.setTitle(section.title);
                c.setBody(piece);
                c.setCharLen(piece.length());
                c.setSourceRef(k.getFileName() + "#" + c.getSeq());
                c.setHitCount(0);
                c.setStatus(1);
                c.setCreateTime(LocalDateTime.now());
                result.add(c);
            }
        }
        return result;
    }

    private List<Section> splitByHeadings(String text) {
        List<Section> sections = new ArrayList<>();
        Matcher md = MD_HEADING.matcher(text);
        if (md.find()) {
            int last = 0;
            String title = "正文";
            md.reset();
            while (md.find()) {
                if (md.start() > last) {
                    sections.add(new Section(title, text.substring(last, md.start()).trim()));
                }
                title = md.group(2).trim();
                last = md.end();
            }
            if (last < text.length()) {
                sections.add(new Section(title, text.substring(last).trim()));
            }
            return sections.isEmpty() ? List.of(new Section("正文", text)) : sections;
        }
        Matcher html = HTML_HEADING.matcher(text);
        if (html.find()) {
            // already plain text usually; treat as single
            return List.of(new Section("正文", Jsoup.parse(text).text()));
        }
        return List.of(new Section("正文", text));
    }

    private List<String> packParagraphs(String body) {
        String[] paras = body.split("\\n{2,}");
        List<String> out = new ArrayList<>();
        StringBuilder buf = new StringBuilder();
        for (String p : paras) {
            String piece = p.trim();
            if (!StringUtils.hasText(piece)) continue;
            if (buf.length() + piece.length() > CHUNK_MAX && buf.length() >= CHUNK_MIN) {
                out.add(buf.toString().trim());
                String prev = buf.toString();
                buf.setLength(0);
                if (prev.length() > OVERLAP) {
                    buf.append(prev.substring(prev.length() - OVERLAP)).append('\n');
                }
            }
            if (buf.length() > 0) buf.append("\n\n");
            buf.append(piece);
        }
        if (buf.length() > 0) {
            out.add(buf.toString().trim());
        }
        // 超长单段再硬切
        List<String> finalOut = new ArrayList<>();
        for (String s : out) {
            if (s.length() <= CHUNK_MAX + 200) {
                finalOut.add(s);
            } else {
                for (int i = 0; i < s.length(); i += CHUNK_MAX - OVERLAP) {
                    finalOut.add(s.substring(i, Math.min(s.length(), i + CHUNK_MAX)));
                }
            }
        }
        return finalOut;
    }

    private record Section(String title, String body) {}
}
