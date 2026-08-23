package com.miniprogram.service.contentagent;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.dto.ContentCategoryDTO;
import com.miniprogram.entity.AgentTaskItem;
import com.miniprogram.entity.Content;
import com.miniprogram.entity.ContentTag;
import com.miniprogram.entity.Product;
import com.miniprogram.entity.SearchLog;
import com.miniprogram.mapper.ContentMapper;
import com.miniprogram.mapper.ContentTagMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.mapper.SearchLogMapper;
import com.miniprogram.service.AgentConfigService;
import com.miniprogram.service.ContentCategoryService;
import com.miniprogram.service.WxMiniappTokenService;
import com.miniprogram.dto.contentagent.ContentAgentTaskType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * 内容 Agent 各任务类型的执行逻辑
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ContentAgentExecutor {

    public static final BigDecimal CONFIDENCE_THRESHOLD = new BigDecimal("0.70");
    private static final Pattern FORBIDDEN_WORDS = Pattern.compile(
            "(最(?!近|新|后|大|小|佳)?[好优强高低多少长短远近新旧])|第一|100%|绝对|国家级|顶级|首选|独家|全网最低");
    private static final List<String> PRICE_KEYWORDS = List.of("价格", "优惠券", "订单", "支付", "退款", "￥", "¥");

    private final ContentMapper contentMapper;
    private final ContentCategoryService contentCategoryService;
    private final ContentTagMapper contentTagMapper;
    private final ProductMapper productMapper;
    private final SearchLogMapper searchLogMapper;
    private final AgentConfigService agentConfigService;
    private final WxMiniappTokenService wxMiniappTokenService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public static class ExecResult {
        public final List<AgentTaskItem> items = new ArrayList<>();
        public int tokensUsed;
    }

    public ExecResult execute(String taskTypeCode, Content content, String freeformPrompt, String targetFormat) {
        ContentAgentTaskType type = ContentAgentTaskType.fromCode(taskTypeCode);
        if (type == null) {
            return new ExecResult();
        }
        return switch (type) {
            case IMPORT_QC -> runImportQc(content);
            case LAYOUT_NORMALIZE -> runLayoutNormalize(content);
            case COMPLIANCE_CHECK -> runComplianceCheck(content);
            case AUTO_CATEGORY -> runAutoCategory(content);
            case AUTO_TAGS -> runAutoTags(content);
            case SUMMARY_SEO -> runSummarySeo(content);
            case COVER_SUGGEST -> runCoverSuggest(content);
            case MULTI_FORMAT -> runMultiFormat(content, targetFormat);
            case TOPIC_DRAFT -> runTopicDraft(freeformPrompt);
            case CONTENT_REFRESH -> runContentRefresh(content);
            case PRODUCT_MOUNT -> runProductMount(content);
            case ANALYTICS_REVIEW -> runAnalyticsReview();
            case SCHEDULE_SUGGEST -> runScheduleSuggest(content);
            case FREEFORM -> runFreeform(content, freeformPrompt);
        };
    }

    /** 任务级（无 contentId） */
    public ExecResult executeGlobal(String taskTypeCode, String freeformPrompt) {
        ContentAgentTaskType type = ContentAgentTaskType.fromCode(taskTypeCode);
        if (type == ContentAgentTaskType.ANALYTICS_REVIEW) {
            return runAnalyticsReview();
        }
        if (type == ContentAgentTaskType.TOPIC_DRAFT) {
            return runTopicDraft(freeformPrompt);
        }
        return new ExecResult();
    }

    private ExecResult runImportQc(Content content) {
        ExecResult r = new ExecResult();
        String html = content.getContent() != null ? content.getContent() : "";
        String plain = Jsoup.parse(html).text();

        checkQc(r, content.getId(), "missing_cover", "warn",
                !StringUtils.hasText(content.getCoverImage()), "缺少封面图");
        checkQc(r, content.getId(), "body_too_short", "warn",
                plain.length() < 80, "正文过短（不足 80 字）");

        Document doc = Jsoup.parse(html);
        Elements imgs = doc.select("img");
        for (Element img : imgs) {
            String src = img.attr("src");
            if (!StringUtils.hasText(src)) {
                addQcItem(r, content.getId(), "img_no_src", "error", "存在无 src 的图片标签");
            } else if (src.contains("localhost") || src.startsWith("127.0.0.1")) {
                addQcItem(r, content.getId(), "img_localhost", "error", "图片指向 localhost");
            }
        }

        Element h1 = doc.selectFirst("h1");
        if (h1 != null && content.getTitle() != null
                && h1.text().trim().equals(content.getTitle().trim())) {
            addQcItem(r, content.getId(), "h1_dup_title", "info", "正文 h1 与标题重复");
        }

        if (html.contains("<p></p><p></p>") || html.contains("<p>&nbsp;</p><p>&nbsp;</p>")) {
            addQcItem(r, content.getId(), "empty_paragraphs", "info", "存在连续空段落");
        }

        String[] paras = plain.split("\n");
        for (String p : paras) {
            if (p.length() > 500) {
                addQcItem(r, content.getId(), "long_paragraph", "warn", "存在超过 500 字未分段落的文本");
                break;
            }
        }

        if (plain.length() > 20 && plain.length() < html.length() / 3) {
            addQcItem(r, content.getId(), "truncated_start", "warn", "开头疑似被裁切（纯文本占比过低）");
        }
        return r;
    }

    private void checkQc(ExecResult r, Long contentId, String code, String level, boolean hit, String msg) {
        if (hit) addQcItem(r, contentId, code, level, msg);
    }

    private void addQcItem(ExecResult r, Long contentId, String code, String level, String msg) {
        AgentTaskItem item = baseItem(contentId, ContentAgentTaskType.IMPORT_QC.getCode(), "_qc");
        item.setIssueCode(code);
        item.setIssueLevel(level);
        item.setNewValue(msg);
        item.setConfidence(BigDecimal.ONE);
        r.items.add(item);
    }

    private ExecResult runLayoutNormalize(Content content) {
        ExecResult r = new ExecResult();
        if ("published".equals(content.getStatus())) {
            return r;
        }
        String html = content.getContent();
        if (!StringUtils.hasText(html)) {
            return r;
        }
        Document doc = Jsoup.parseBodyFragment(html);
        doc.select("section:empty, span:empty").remove();
        doc.select("img").forEach(img -> {
            if (!img.hasAttr("alt")) {
                img.attr("alt", content.getTitle() != null ? content.getTitle() : "配图");
            }
        });
        doc.select("h1").forEach(h -> h.tagName("h2"));
        String normalized = doc.body().html()
                .replaceAll("(<br\\s*/?>\\s*){3,}", "<br/><br/>")
                .replaceAll("<p>\\s*</p>", "");
        normalized = normalizePunctuation(normalized);
        if (!normalized.equals(html)) {
            AgentTaskItem item = baseItem(content.getId(), ContentAgentTaskType.LAYOUT_NORMALIZE.getCode(), "content");
            item.setOldValue(html);
            item.setNewValue(normalized);
            item.setConfidence(new BigDecimal("0.95"));
            r.items.add(item);
        }
        return r;
    }

    private String normalizePunctuation(String text) {
        return text.replace(",", "，")
                .replace(";", "；")
                .replace("!", "！")
                .replace("?", "？")
                .replaceAll("([\\u4e00-\\u9fa5])([A-Za-z])", "$1 $2")
                .replaceAll("([A-Za-z])([\\u4e00-\\u9fa5])", "$1 $2");
    }

    private ExecResult runComplianceCheck(Content content) {
        ExecResult r = new ExecResult();
        String text = (content.getTitle() != null ? content.getTitle() : "")
                + "\n" + Jsoup.parse(content.getContent() != null ? content.getContent() : "").text()
                + "\n" + (content.getSummary() != null ? content.getSummary() : "");

        Matcher m = FORBIDDEN_WORDS.matcher(text);
        while (m.find()) {
            AgentTaskItem item = baseItem(content.getId(), ContentAgentTaskType.COMPLIANCE_CHECK.getCode(), "_qc");
            item.setIssueCode("forbidden_word");
            item.setIssueLevel("warn");
            item.setNewValue("疑似绝对化用语：" + m.group());
            item.setConfidence(new BigDecimal("0.85"));
            r.items.add(item);
        }

        for (String kw : PRICE_KEYWORDS) {
            if (text.contains(kw)) {
                AgentTaskItem item = baseItem(content.getId(), ContentAgentTaskType.COMPLIANCE_CHECK.getCode(), "_qc");
                item.setIssueCode("sensitive_commerce");
                item.setIssueLevel("info");
                item.setNewValue("含商业/价格相关表述「" + kw + "」，采纳正文改动前请人工复核");
                item.setConfidence(BigDecimal.ONE);
                r.items.add(item);
            }
        }

        try {
            String token = wxMiniappTokenService.getAccessToken();
            Map<String, Object> body = Map.of("content", text.substring(0, Math.min(text.length(), 500)));
            ResponseEntity<Map> resp = restTemplate.postForEntity(
                    "https://api.weixin.qq.com/wxa/msg_sec_check?access_token=" + token, body, Map.class);
            Map<?, ?> json = resp.getBody();
            Object err = json == null ? null : json.get("errcode");
            if (err != null && Integer.parseInt(String.valueOf(err)) == 87014) {
                AgentTaskItem item = baseItem(content.getId(), ContentAgentTaskType.COMPLIANCE_CHECK.getCode(), "_qc");
                item.setIssueCode("wx_sec_fail");
                item.setIssueLevel("error");
                item.setNewValue("微信内容安全检测未通过");
                item.setConfidence(BigDecimal.ONE);
                r.items.add(item);
            }
        } catch (Exception e) {
            log.debug("msgSecCheck skip: {}", e.getMessage());
        }
        return r;
    }

    private ExecResult runAutoCategory(Content content) {
        ExecResult r = new ExecResult();
        List<ContentCategoryDTO> tree = contentCategoryService.listCategoryTree();
        String categories = flattenCategories(tree, 0);
        String plain = Jsoup.parse(content.getContent() != null ? content.getContent() : "").text();
        String user = "标题：" + content.getTitle() + "\n正文摘要：" + truncate(plain, 800)
                + "\n\n可选分类（id: 名称）：\n" + categories
                + "\n\n请只返回 JSON：{\"categoryId\":数字,\"categoryName\":\"\",\"confidence\":0.0~1.0}";
        Map<String, Object> llm = agentConfigService.chatForRole("content_ops",
                "你是内容分类助手，只能从给定分类中选择，不确定时 confidence 低于 0.5。", user, 256);
        r.tokensUsed += intToken(llm);
        Map<String, Object> parsed = parseJsonMap(String.valueOf(llm.getOrDefault("answer", "")));
        if (parsed == null) {
            return r;
        }
        Object cid = parsed.get("categoryId");
        Object conf = parsed.get("confidence");
        if (cid == null) return r;
        BigDecimal confidence = toConfidence(conf);
        AgentTaskItem item = baseItem(content.getId(), ContentAgentTaskType.AUTO_CATEGORY.getCode(), "categoryId");
        item.setOldValue(content.getCategoryId() != null ? String.valueOf(content.getCategoryId()) : "");
        item.setNewValue(String.valueOf(cid));
        item.setConfidence(confidence);
        if (confidence.compareTo(CONFIDENCE_THRESHOLD) >= 0) {
            r.items.add(item);
        } else {
            item.setExtraJson("{\"note\":\"置信度低于阈值，需人工确认\"}");
            r.items.add(item);
        }
        return r;
    }

    private ExecResult runAutoTags(Content content) {
        ExecResult r = new ExecResult();
        List<ContentTag> tags = contentTagMapper.selectList(new LambdaQueryWrapper<ContentTag>()
                .orderByDesc(ContentTag::getUseCount).last("LIMIT 80"));
        String tagList = tags.stream().map(ContentTag::getName).collect(Collectors.joining("、"));
        String plain = Jsoup.parse(content.getContent() != null ? content.getContent() : "").text();
        String user = "标题：" + content.getTitle() + "\n正文：" + truncate(plain, 600)
                + "\n\n已有标签库：" + tagList
                + "\n\n返回 JSON：{\"tags\":[\"标签1\"],\"confidence\":0.0~1.0}，最多5个，优先复用已有标签";
        Map<String, Object> llm = agentConfigService.chatForRole("content_ops",
                "你是标签助手，不要创造过多新标签。", user, 256);
        r.tokensUsed += intToken(llm);
        Map<String, Object> parsed = parseJsonMap(String.valueOf(llm.getOrDefault("answer", "")));
        if (parsed == null) return r;
        Object tagsObj = parsed.get("tags");
        if (!(tagsObj instanceof List<?> list) || list.isEmpty()) return r;
        List<String> newTags = list.stream().map(String::valueOf).limit(5).toList();
        AgentTaskItem item = baseItem(content.getId(), ContentAgentTaskType.AUTO_TAGS.getCode(), "tags");
        item.setOldValue(content.getTags());
        try {
            item.setNewValue(objectMapper.writeValueAsString(newTags));
        } catch (Exception e) {
            item.setNewValue(String.join(",", newTags));
        }
        item.setConfidence(toConfidence(parsed.get("confidence")));
        r.items.add(item);
        return r;
    }

    private ExecResult runSummarySeo(Content content) {
        ExecResult r = new ExecResult();
        String plain = Jsoup.parse(content.getContent() != null ? content.getContent() : "").text();
        String user = "标题：" + content.getTitle() + "\n正文：" + truncate(plain, 1200)
                + "\n\n返回 JSON：{\"summary\":\"120字内摘要\",\"seoTitle\":\"\",\"seoDescription\":\"\",\"shareWechat\":\"\",\"shareMoment\":\"\",\"shareGroup\":\"\",\"confidence\":0.9}";
        Map<String, Object> llm = agentConfigService.chatForRole("content_ops",
                "生成摘要与 SEO 文案，语气专业克制。", user, 512);
        r.tokensUsed += intToken(llm);
        Map<String, Object> parsed = parseJsonMap(String.valueOf(llm.getOrDefault("answer", "")));
        if (parsed == null) return r;
        BigDecimal conf = toConfidence(parsed.get("confidence"));
        addFieldIfPresent(r, content, ContentAgentTaskType.SUMMARY_SEO.getCode(), "summary",
                content.getSummary(), str(parsed.get("summary")), conf);
        addFieldIfPresent(r, content, ContentAgentTaskType.SUMMARY_SEO.getCode(), "seoTitle",
                content.getSeoTitle(), str(parsed.get("seoTitle")), conf);
        addFieldIfPresent(r, content, ContentAgentTaskType.SUMMARY_SEO.getCode(), "seoDescription",
                content.getSeoDescription(), str(parsed.get("seoDescription")), conf);
        if (StringUtils.hasText(str(parsed.get("shareWechat")))) {
            AgentTaskItem extra = baseItem(content.getId(), ContentAgentTaskType.SUMMARY_SEO.getCode(), "_share");
            Map<String, String> shares = new LinkedHashMap<>();
            shares.put("wechat", str(parsed.get("shareWechat")));
            shares.put("moment", str(parsed.get("shareMoment")));
            shares.put("group", str(parsed.get("shareGroup")));
            try {
                extra.setNewValue(objectMapper.writeValueAsString(shares));
            } catch (Exception ignored) {
            }
            extra.setConfidence(conf);
            r.items.add(extra);
        }
        return r;
    }

    private ExecResult runCoverSuggest(Content content) {
        ExecResult r = new ExecResult();
        if (StringUtils.hasText(content.getCoverImage())) {
            return r;
        }
        Document doc = Jsoup.parse(content.getContent() != null ? content.getContent() : "");
        Element first = doc.selectFirst("img[src]");
        if (first != null && StringUtils.hasText(first.attr("src"))) {
            AgentTaskItem item = baseItem(content.getId(), ContentAgentTaskType.COVER_SUGGEST.getCode(), "coverImage");
            item.setOldValue("");
            item.setNewValue(first.attr("src"));
            item.setConfidence(new BigDecimal("0.80"));
            r.items.add(item);
        } else {
            AgentTaskItem item = baseItem(content.getId(), ContentAgentTaskType.COVER_SUGGEST.getCode(), "_qc");
            item.setIssueCode("no_image");
            item.setIssueLevel("warn");
            item.setNewValue("正文无可用图片，需人工补充封面");
            item.setConfidence(BigDecimal.ONE);
            r.items.add(item);
        }
        return r;
    }

    private ExecResult runMultiFormat(Content content, String targetFormat) {
        ExecResult r = new ExecResult();
        if ("published".equals(content.getStatus())) {
            return r;
        }
        String fmt = StringUtils.hasText(targetFormat) ? targetFormat : "note";
        String plain = Jsoup.parse(content.getContent() != null ? content.getContent() : "").text();
        String user = "原标题：" + content.getTitle() + "\n原文：" + truncate(plain, 2000)
                + "\n\n目标形态：" + fmt + "（note=小红书风短文, moment=朋友圈文案）"
                + "\n返回 JSON：{\"title\":\"\",\"content\":\"\",\"contentType\":\"" + fmt + "\",\"confidence\":0.85}";
        Map<String, Object> llm = agentConfigService.chatForRole("content_ops",
                "一稿多态：改写为指定形态，保留核心信息，不编造事实。", user, 1024);
        r.tokensUsed += intToken(llm);
        Map<String, Object> parsed = parseJsonMap(String.valueOf(llm.getOrDefault("answer", "")));
        if (parsed == null) return r;
        AgentTaskItem item = baseItem(content.getId(), ContentAgentTaskType.MULTI_FORMAT.getCode(), "content");
        item.setOldValue(content.getContent());
        item.setNewValue(str(parsed.get("content")));
        item.setConfidence(toConfidence(parsed.get("confidence")));
        Map<String, Object> meta = new HashMap<>();
        meta.put("title", parsed.get("title"));
        meta.put("contentType", parsed.get("contentType"));
        try {
            item.setExtraJson(objectMapper.writeValueAsString(meta));
        } catch (Exception ignored) {
        }
        r.items.add(item);
        return r;
    }

    private ExecResult runTopicDraft(String freeformPrompt) {
        ExecResult r = new ExecResult();
        List<SearchLog> recent = searchLogMapper.selectList(new LambdaQueryWrapper<SearchLog>()
                .orderByDesc(SearchLog::getCreateTime).last("LIMIT 200"));
        Map<String, Integer> zero = new LinkedHashMap<>();
        for (SearchLog s : recent) {
            if (s.getResultCount() != null && s.getResultCount() == 0) {
                zero.merge(s.getKeyword(), 1, Integer::sum);
            }
        }
        String noResult = zero.entrySet().stream().limit(15)
                .map(e -> e.getKey() + "(" + e.getValue() + ")").collect(Collectors.joining("、"));
        String user = "搜索无结果词：" + noResult + "\n运营补充：" + (freeformPrompt != null ? freeformPrompt : "")
                + "\n\n返回 JSON：{\"topics\":[{\"title\":\"\",\"outline\":\"\",\"confidence\":0.8}],\"draft\":{\"title\":\"\",\"content\":\"html片段\"}}";
        Map<String, Object> llm = agentConfigService.chatForRole("content_ops",
                "基于搜索缺口生成选题与初稿，只落草稿，政策类内容标注需核实。", user, 1536);
        r.tokensUsed += intToken(llm);
        AgentTaskItem item = baseItem(0L, ContentAgentTaskType.TOPIC_DRAFT.getCode(), "_report");
        item.setNewValue(String.valueOf(llm.getOrDefault("answer", "")));
        item.setConfidence(new BigDecimal("0.75"));
        r.items.add(item);
        return r;
    }

    private ExecResult runContentRefresh(Content content) {
        ExecResult r = new ExecResult();
        if ("published".equals(content.getStatus())) {
            return r;
        }
        String plain = Jsoup.parse(content.getContent() != null ? content.getContent() : "").text();
        String user = "标题：" + content.getTitle() + "\n原文：" + truncate(plain, 2500)
                + "\n\n焕新要求：更新过时表述，标注【需人工核实】处。"
                + "\n返回 JSON：{\"content\":\"html\",\"notes\":[\"需核实点\"],\"confidence\":0.7}";
        Map<String, Object> llm = agentConfigService.chatForRole("content_ops",
                "旧文焕新，禁止编造政策与数据。", user, 1536);
        r.tokensUsed += intToken(llm);
        Map<String, Object> parsed = parseJsonMap(String.valueOf(llm.getOrDefault("answer", "")));
        if (parsed == null) return r;
        AgentTaskItem item = baseItem(content.getId(), ContentAgentTaskType.CONTENT_REFRESH.getCode(), "content");
        item.setOldValue(content.getContent());
        item.setNewValue(str(parsed.get("content")));
        item.setConfidence(toConfidence(parsed.get("confidence")));
        if (parsed.get("notes") != null) {
            try {
                item.setExtraJson(objectMapper.writeValueAsString(Map.of("notes", parsed.get("notes"))));
            } catch (Exception ignored) {
            }
        }
        r.items.add(item);
        return r;
    }

    private ExecResult runProductMount(Content content) {
        ExecResult r = new ExecResult();
        List<Product> products = productMapper.selectList(new LambdaQueryWrapper<Product>()
                .eq(Product::getStatus, "on_sale").orderByDesc(Product::getSales).last("LIMIT 30"));
        String catalog = products.stream()
                .map(p -> p.getId() + ":" + p.getName())
                .collect(Collectors.joining("\n"));
        String plain = Jsoup.parse(content.getContent() != null ? content.getContent() : "").text();
        String user = "文章：" + content.getTitle() + "\n" + truncate(plain, 800)
                + "\n\n在售商品：\n" + catalog
                + "\n\n返回 JSON：{\"productIds\":[1,2],\"reason\":\"\",\"confidence\":0.8}";
        Map<String, Object> llm = agentConfigService.chatForRole("content_ops",
                "推荐与正文语义相关的商品，不超过3个。", user, 256);
        r.tokensUsed += intToken(llm);
        Map<String, Object> parsed = parseJsonMap(String.valueOf(llm.getOrDefault("answer", "")));
        if (parsed == null) return r;
        AgentTaskItem item = baseItem(content.getId(), ContentAgentTaskType.PRODUCT_MOUNT.getCode(), "productIds");
        item.setNewValue(String.valueOf(parsed.get("productIds")));
        item.setExtraJson(str(parsed.get("reason")));
        item.setConfidence(toConfidence(parsed.get("confidence")));
        r.items.add(item);
        return r;
    }

    private ExecResult runAnalyticsReview() {
        ExecResult r = new ExecResult();
        List<Content> top = contentMapper.selectList(new LambdaQueryWrapper<Content>()
                .eq(Content::getStatus, "published")
                .orderByDesc(Content::getViewCount).last("LIMIT 10"));
        StringBuilder sb = new StringBuilder("阅读 TOP：\n");
        for (Content c : top) {
            sb.append("- ").append(c.getTitle()).append(" 阅读").append(c.getViewCount()).append("\n");
        }
        String user = sb + "\n请生成周报 JSON：{\"summary\":\"\",\"highlights\":[],\"nextTopics\":[],\"confidence\":1.0}";
        Map<String, Object> llm = agentConfigService.chatForRole("content_ops",
                "内容运营复盘助手。", user, 768);
        r.tokensUsed += intToken(llm);
        AgentTaskItem item = baseItem(0L, ContentAgentTaskType.ANALYTICS_REVIEW.getCode(), "_report");
        item.setNewValue(String.valueOf(llm.getOrDefault("answer", "")));
        item.setConfidence(BigDecimal.ONE);
        r.items.add(item);
        return r;
    }

    private ExecResult runScheduleSuggest(Content content) {
        ExecResult r = new ExecResult();
        String user = "文章标题：" + content.getTitle() + "\n当前时间：" + LocalDateTime.now()
                + "\n\n返回 JSON：{\"scheduledAt\":\"yyyy-MM-dd HH:mm:ss\",\"reason\":\"\",\"confidence\":0.75}";
        Map<String, Object> llm = agentConfigService.chatForRole("content_ops",
                "建议工作日上午9-11点或晚间20-22点发布。", user, 128);
        r.tokensUsed += intToken(llm);
        Map<String, Object> parsed = parseJsonMap(String.valueOf(llm.getOrDefault("answer", "")));
        if (parsed == null) return r;
        AgentTaskItem item = baseItem(content.getId(), ContentAgentTaskType.SCHEDULE_SUGGEST.getCode(), "scheduledAt");
        item.setOldValue(content.getScheduledAt() != null
                ? content.getScheduledAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : "");
        item.setNewValue(str(parsed.get("scheduledAt")));
        item.setExtraJson(str(parsed.get("reason")));
        item.setConfidence(toConfidence(parsed.get("confidence")));
        r.items.add(item);
        return r;
    }

    private ExecResult runFreeform(Content content, String prompt) {
        ExecResult r = new ExecResult();
        if (!StringUtils.hasText(prompt)) return r;
        String plain = Jsoup.parse(content.getContent() != null ? content.getContent() : "").text();
        String user = "标题：" + content.getTitle() + "\n正文：" + truncate(plain, 2000) + "\n\n指令：" + prompt
                + "\n\n若修改正文返回 JSON：{\"field\":\"content|summary|...\",\"newValue\":\"\",\"confidence\":0.8}";
        Map<String, Object> llm = agentConfigService.chatForRole("content_ops", "按运营指令处理单篇内容。", user, 1024);
        r.tokensUsed += intToken(llm);
        Map<String, Object> parsed = parseJsonMap(String.valueOf(llm.getOrDefault("answer", "")));
        if (parsed == null) {
            AgentTaskItem item = baseItem(content.getId(), ContentAgentTaskType.FREEFORM.getCode(), "_report");
            item.setNewValue(String.valueOf(llm.getOrDefault("answer", "")));
            item.setConfidence(new BigDecimal("0.70"));
            r.items.add(item);
            return r;
        }
        String field = str(parsed.get("field"));
        if (!StringUtils.hasText(field)) field = "content";
        if ("published".equals(content.getStatus()) && "content".equals(field)) {
            return r;
        }
        AgentTaskItem item = baseItem(content.getId(), ContentAgentTaskType.FREEFORM.getCode(), field);
        item.setOldValue(readField(content, field));
        item.setNewValue(str(parsed.get("newValue")));
        item.setConfidence(toConfidence(parsed.get("confidence")));
        r.items.add(item);
        return r;
    }

    private AgentTaskItem baseItem(Long contentId, String taskType, String field) {
        AgentTaskItem item = new AgentTaskItem();
        item.setContentId(contentId);
        item.setTaskType(taskType);
        item.setField(field);
        item.setReviewStatus("pending");
        return item;
    }

    private void addFieldIfPresent(ExecResult r, Content content, String taskType, String field,
                                   String oldVal, String newVal, BigDecimal conf) {
        if (!StringUtils.hasText(newVal) || newVal.equals(oldVal)) return;
        AgentTaskItem item = baseItem(content.getId(), taskType, field);
        item.setOldValue(oldVal != null ? oldVal : "");
        item.setNewValue(newVal);
        item.setConfidence(conf);
        r.items.add(item);
    }

    private String readField(Content c, String field) {
        return switch (field) {
            case "summary" -> c.getSummary();
            case "seoTitle" -> c.getSeoTitle();
            case "seoDescription" -> c.getSeoDescription();
            case "coverImage" -> c.getCoverImage();
            case "categoryId" -> c.getCategoryId() != null ? String.valueOf(c.getCategoryId()) : "";
            case "tags" -> c.getTags();
            case "scheduledAt" -> c.getScheduledAt() != null
                    ? c.getScheduledAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : "";
            default -> c.getContent();
        };
    }

    private String flattenCategories(List<ContentCategoryDTO> tree, int depth) {
        StringBuilder sb = new StringBuilder();
        for (ContentCategoryDTO c : tree) {
            sb.append("  ".repeat(depth)).append(c.getId()).append(": ").append(c.getName()).append("\n");
            if (c.getChildren() != null && !c.getChildren().isEmpty()) {
                sb.append(flattenCategories(c.getChildren(), depth + 1));
            }
        }
        return sb.toString();
    }

    private Map<String, Object> parseJsonMap(String raw) {
        if (!StringUtils.hasText(raw)) return null;
        String text = raw.trim();
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            text = text.substring(start, end + 1);
        }
        try {
            JsonNode node = objectMapper.readTree(text);
            if (node.isObject()) {
                return objectMapper.convertValue(node, new TypeReference<>() {});
            }
        } catch (Exception e) {
            log.debug("JSON parse failed: {}", e.getMessage());
        }
        return null;
    }

    private BigDecimal toConfidence(Object v) {
        if (v == null) return new BigDecimal("0.50");
        try {
            return new BigDecimal(String.valueOf(v)).setScale(4, RoundingMode.HALF_UP);
        } catch (Exception e) {
            return new BigDecimal("0.50");
        }
    }

    private int intToken(Map<String, Object> llm) {
        Object t = llm.get("estimatedTokens");
        return t == null ? 0 : Integer.parseInt(String.valueOf(t));
    }

    private String str(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
