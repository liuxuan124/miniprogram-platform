package com.miniprogram.service.impl;

import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.dto.system.UploadResultVO;
import com.miniprogram.dto.wechat.ParsedWeChatArticle;
import com.miniprogram.dto.wechat.WeChatContentSyncRequestDTO;
import com.miniprogram.dto.wechat.WeChatContentSyncResultVO;
import com.miniprogram.dto.wechat.WeChatUrlImportRequestDTO;
import com.miniprogram.entity.Content;
import com.miniprogram.mapper.ContentMapper;
import com.miniprogram.service.ContentCategoryService;
import com.miniprogram.service.FileUploadService;
import com.miniprogram.service.ImportTaskService;
import com.miniprogram.service.WeChatOfficialAccountClient;
import com.miniprogram.service.WeChatOfficialAccountContentSyncService;
import com.miniprogram.service.wechat.WeChatArticlePageParser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 微信公众号已发布内容 → 内容库同步（长文 news + 贴图 newspic）
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WeChatOfficialAccountContentSyncServiceImpl implements WeChatOfficialAccountContentSyncService {

    private static final String EXTERNAL_SOURCE = "wechat_oa";
    private static final String EXTERNAL_SOURCE_URL = "wechat_url";
    private static final String SOURCE_LABEL = "微信公众号";
    private static final Pattern IMG_SRC_PATTERN = Pattern.compile(
            "(<img[^>]*?\\s)(?:src|data-src)(\\s*=\\s*[\"'])([^\"']+)([\"'][^>]*>)",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern IFRAME_SRC_PATTERN = Pattern.compile(
            "<iframe[^>]+\\ssrc\\s*=\\s*[\"']([^\"']+)[\"']",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern STYLE_BLOCK_PATTERN = Pattern.compile("<style[\\s>]", Pattern.CASE_INSENSITIVE);
    private static final Pattern HTML_TAG_PATTERN = Pattern.compile("<[^>]+>");
    /** 已发布接口无 image_info 时，用标题特征辅助识别贴图 */
    private static final Pattern NOTE_TITLE_HINT = Pattern.compile(
            "一张图|一图|图解|地图|海报|图看懂|图讲透|结构拆解|流程图|思维导图|合规SOP|财税地图",
            Pattern.CASE_INSENSITIVE);

    private static final int MAX_URL_IMPORT = 10;

    private final WeChatOfficialAccountClient weChatOfficialAccountClient;
    private final WeChatArticlePageParser weChatArticlePageParser;
    private final ContentMapper contentMapper;
    private final ContentCategoryService categoryService;
    private final FileUploadService fileUploadService;
    private final ObjectMapper objectMapper;
    private final ImportTaskService importTaskService;

    @Override
    public WeChatContentSyncResultVO syncAllPublished(WeChatContentSyncRequestDTO request) {
        return syncAllPublished(request, null);
    }

    @Override
    @Async("importExecutor")
    public void syncAllPublishedAsync(WeChatContentSyncRequestDTO request, String taskId) {
        try {
            importTaskService.markRunning(taskId);
            WeChatContentSyncResultVO result = syncAllPublished(request, taskId);
            importTaskService.finish(taskId, result);
        } catch (Exception e) {
            log.error("异步全量导入失败 taskId={}: {}", taskId, e.getMessage(), e);
            importTaskService.fail(taskId, e.getMessage());
        }
    }

    @Override
    public WeChatContentSyncResultVO syncAllPublished(WeChatContentSyncRequestDTO request, String taskId) {
        WeChatContentSyncRequestDTO safeRequest = request != null ? request : new WeChatContentSyncRequestDTO();
        boolean publish = safeRequest.getPublish() == null || Boolean.TRUE.equals(safeRequest.getPublish());
        SyncScope syncScope = SyncScope.from(safeRequest.getSyncScope());
        Long categoryId = safeRequest.getCategoryId();
        if (categoryId != null) {
            if (categoryService.getById(categoryId) == null) {
                throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "分类不存在");
            }
        }

        WeChatContentSyncResultVO result = new WeChatContentSyncResultVO();
        List<JSONObject> records = weChatOfficialAccountClient.listAllPublishedRecords();
        result.setTotalPublishRecords(records.size());
        reportProgress(taskId, 0, records.size(), null);
        Map<String, JSONObject> newspicIndex = buildNewspicIndex(records);

        Map<String, String> imageCache = new LinkedHashMap<>();
        Map<String, byte[]> mediaCache = new LinkedHashMap<>();
        int articlesProcessed = 0;
        LocalDateTime syncBase = LocalDateTime.now();
        int importSeq = 0;

        for (JSONObject record : records) {
            String articleId = record.getStr("article_id");
            JSONArray newsItems = resolveNewsItems(record, articleId, result);

            if (newsItems == null || newsItems.isEmpty()) {
                result.setSkipped(result.getSkipped() + 1);
                continue;
            }

            long updateTime = record.getLong("update_time", 0L);
            LocalDateTime publishedAt = toLocalDateTime(updateTime);

            for (int i = 0; i < newsItems.size(); i++) {
                JSONObject item = newsItems.getJSONObject(i);
                if (item == null) {
                    continue;
                }
                enrichNewsItemFromIndex(item, newspicIndex);
                articlesProcessed++;
                LocalDateTime importTime = syncBase.plusNanos((long) importSeq++ * 1_000_000L);
                try {
                    SyncAction action = upsertPublishedItem(
                            item, articleId, i, categoryId, publish, publishedAt, syncScope,
                            imageCache, mediaCache, result, importTime);
                    switch (action) {
                        case CREATE -> result.setCreated(result.getCreated() + 1);
                        case UPDATE -> result.setUpdated(result.getUpdated() + 1);
                        case SKIP -> result.setSkipped(result.getSkipped() + 1);
                        case TYPE_FILTERED -> { /* counted in upsertPublishedItem */ }
                    }
                } catch (Exception e) {
                    log.warn("同步图文失败 articleId={} idx={}: {}", articleId, i, e.getMessage());
                    result.setFailed(result.getFailed() + 1);
                    result.getFailures().add(new WeChatContentSyncResultVO.FailureItem(
                            item.getStr("title", articleId + "#" + i), e.getMessage()));
                }
                // total 用发布记录数；processed 可能超过 total，前端 Math.min
                reportProgress(taskId, articlesProcessed, records.size(),
                        item.getStr("title", articleId));
            }
        }

        result.setTotalArticles(articlesProcessed);
        result.setMessage(String.format(
                "范围「%s」：扫描 %d 条，长文 %d，贴图 %d；新建 %d，更新 %d，类型筛选跳过 %d，其他跳过 %d，失败 %d",
                syncScope.label(),
                result.getTotalArticles(),
                result.getArticleCount(),
                result.getNoteCount(),
                result.getCreated(),
                result.getUpdated(),
                result.getTypeFiltered(),
                result.getSkipped(),
                result.getFailed()));
        return result;
    }

    @Override
    public WeChatContentSyncResultVO importFromUrls(WeChatUrlImportRequestDTO request) {
        return importFromUrls(request, null);
    }

    @Override
    @Async("importExecutor")
    public void importFromUrlsAsync(WeChatUrlImportRequestDTO request, String taskId) {
        try {
            importTaskService.markRunning(taskId);
            WeChatContentSyncResultVO result = importFromUrls(request, taskId);
            importTaskService.finish(taskId, result);
        } catch (Exception e) {
            log.error("异步链接导入失败 taskId={}: {}", taskId, e.getMessage(), e);
            importTaskService.fail(taskId, e.getMessage());
        }
    }

    @Override
    public WeChatContentSyncResultVO importFromUrls(WeChatUrlImportRequestDTO request, String taskId) {
        WeChatUrlImportRequestDTO safeRequest = request != null ? request : new WeChatUrlImportRequestDTO();
        boolean publish = Boolean.TRUE.equals(safeRequest.getPublish());
        Long categoryId = safeRequest.getCategoryId();
        if (categoryId != null && categoryService.getById(categoryId) == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "分类不存在");
        }

        List<String> urls = normalizeImportUrls(safeRequest.getUrls());
        if (urls.isEmpty()) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "请至少填写一条公众号文章链接");
        }
        if (urls.size() > MAX_URL_IMPORT) {
            throw new BusinessException(ErrorCode.PARAM_ERROR,
                    "单次最多导入 " + MAX_URL_IMPORT + " 条链接，请分批提交");
        }

        WeChatContentSyncResultVO result = new WeChatContentSyncResultVO();
        result.setTotalPublishRecords(urls.size());
        result.setTotalArticles(urls.size());
        reportProgress(taskId, 0, urls.size(), null);

        Map<String, String> imageCache = new LinkedHashMap<>();
        LocalDateTime syncBase = LocalDateTime.now();
        int importSeq = 0;

        for (String url : urls) {
            try {
                ParsedWeChatArticle parsed = weChatArticlePageParser.fetchAndParse(url);
                LocalDateTime importTime = syncBase.plusNanos((long) importSeq++ * 1_000_000L);
                SyncAction action = upsertFromArticleUrl(parsed, categoryId, publish, imageCache, importTime, result);
                switch (action) {
                    case CREATE -> {
                        result.setCreated(result.getCreated() + 1);
                        result.setArticleCount(result.getArticleCount() + 1);
                    }
                    case UPDATE -> {
                        result.setUpdated(result.getUpdated() + 1);
                        result.setArticleCount(result.getArticleCount() + 1);
                    }
                    default -> result.setSkipped(result.getSkipped() + 1);
                }
                reportProgress(taskId, importSeq, urls.size(),
                        parsed != null ? parsed.getTitle() : shortenUrl(url));
            } catch (Exception e) {
                log.warn("链接导入失败 url={}: {}", url, e.getMessage());
                result.setFailed(result.getFailed() + 1);
                result.getFailures().add(new WeChatContentSyncResultVO.FailureItem(
                        shortenUrl(url), e.getMessage()));
                importSeq++;
                reportProgress(taskId, importSeq, urls.size(), shortenUrl(url));
            }
        }

        result.setMessage(String.format(
                "链接导入：共 %d 条，新建 %d，更新 %d，跳过 %d，失败 %d",
                urls.size(),
                result.getCreated(),
                result.getUpdated(),
                result.getSkipped(),
                result.getFailed()));
        return result;
    }

    private void reportProgress(String taskId, int processed, int total, String currentTitle) {
        if (!StringUtils.hasText(taskId)) {
            return;
        }
        importTaskService.updateProgress(taskId, processed, total, currentTitle);
    }

    private List<String> normalizeImportUrls(List<String> rawUrls) {
        List<String> urls = new ArrayList<>();
        if (rawUrls == null) {
            return urls;
        }
        for (String line : rawUrls) {
            if (!StringUtils.hasText(line)) {
                continue;
            }
            for (String part : line.split("[\\s,，;；]+")) {
                if (StringUtils.hasText(part)) {
                    urls.add(part.trim());
                }
            }
        }
        return urls;
    }

    private SyncAction upsertFromArticleUrl(
            ParsedWeChatArticle parsed,
            Long categoryId,
            boolean publish,
            Map<String, String> imageCache,
            LocalDateTime importTime,
            WeChatContentSyncResultVO result) {

        String slug = parsed.getSlug();
        Content entity = loadOrCreateByUrl(slug, parsed.getTitle());
        boolean isCreate = entity.getId() == null;

        String title = trim(parsed.getTitle());
        entity.setTitle(title.length() > 128 ? title.substring(0, 128) : title);
        entity.setContentType("article");
        entity.setAuthor(trim(parsed.getAuthor()));
        entity.setSource(SOURCE_LABEL);
        entity.setExternalSource(EXTERNAL_SOURCE_URL);
        entity.setExternalId(slug);

        String plain = extractPlainText(parsed.getContentHtml());
        entity.setSummary(StringUtils.hasText(plain)
                ? (plain.length() > 512 ? plain.substring(0, 512) : plain)
                : entity.getTitle());

        if (StringUtils.hasText(parsed.getCoverImageUrl())) {
            entity.setCoverImage(mirrorRemoteImage(parsed.getCoverImageUrl(), imageCache, "wechat-url"));
        }
        entity.setImages(null);
        entity.setContent(rewriteHtmlImages(parsed.getContentHtml(), imageCache, "wechat-url"));
        applyWechatSpecialElementHints(entity, parsed.getTitle(), result);
        appendOriginalLink(entity, parsed.getSourceUrl(), parsed.getSourceUrl());

        applyCommonFields(entity, "url:" + slug, categoryId, publish,
                parsed.getPublishedAt() != null ? parsed.getPublishedAt() : LocalDateTime.now(), "news");

        return persist(entity, isCreate, importTime);
    }

    private Content loadOrCreateByUrl(String slug, String title) {
        Content existing = contentMapper.selectOne(new LambdaQueryWrapper<Content>()
                .eq(Content::getExternalSource, EXTERNAL_SOURCE_URL)
                .eq(Content::getExternalId, slug)
                .last("LIMIT 1"));
        if (existing != null) {
            return existing;
        }
        if (StringUtils.hasText(title)) {
            existing = contentMapper.selectOne(new LambdaQueryWrapper<Content>()
                    .eq(Content::getTitle, title)
                    .eq(Content::getSource, SOURCE_LABEL)
                    .last("LIMIT 1"));
            if (existing != null) {
                return existing;
            }
        }
        return new Content();
    }

    private String shortenUrl(String url) {
        if (!StringUtils.hasText(url) || url.length() <= 48) {
            return url;
        }
        return url.substring(0, 45) + "...";
    }

    private JSONArray resolveNewsItems(
            JSONObject record,
            String articleId,
            WeChatContentSyncResultVO result) {
        JSONArray fromBatch = null;
        JSONObject contentWrapper = record.getJSONObject("content");
        if (contentWrapper != null) {
            fromBatch = contentWrapper.getJSONArray("news_item");
        }

        JSONArray fromDetail = null;
        if (StringUtils.hasText(articleId)) {
            try {
                JSONObject detail = weChatOfficialAccountClient.getPublishedArticle(articleId);
                fromDetail = detail.getJSONArray("news_item");
            } catch (Exception e) {
                log.warn("拉取 article_id={} 详情失败: {}", articleId, e.getMessage());
                result.setFailed(result.getFailed() + 1);
                result.getFailures().add(new WeChatContentSyncResultVO.FailureItem(
                        articleId, e.getMessage()));
            }
        }
        return mergeNewsItems(fromBatch, fromDetail);
    }

    private JSONArray mergeNewsItems(JSONArray fromBatch, JSONArray fromDetail) {
        if (fromBatch == null || fromBatch.isEmpty()) {
            return fromDetail;
        }
        if (fromDetail == null || fromDetail.isEmpty()) {
            return fromBatch;
        }
        JSONArray merged = new JSONArray();
        int size = Math.max(fromBatch.size(), fromDetail.size());
        for (int i = 0; i < size; i++) {
            JSONObject batchItem = i < fromBatch.size() ? fromBatch.getJSONObject(i) : null;
            JSONObject detailItem = i < fromDetail.size() ? fromDetail.getJSONObject(i) : null;
            JSONObject target;
            if (batchItem != null) {
                target = JSONUtil.parseObj(batchItem.toString());
                if (detailItem != null) {
                    if (StringUtils.hasText(detailItem.getStr("content"))) {
                        target.set("content", detailItem.getStr("content"));
                    }
                    if (StringUtils.hasText(detailItem.getStr("url"))) {
                        target.set("url", detailItem.getStr("url"));
                    }
                    if (StringUtils.hasText(detailItem.getStr("digest")) && !StringUtils.hasText(target.getStr("digest"))) {
                        target.set("digest", detailItem.getStr("digest"));
                    }
                    if (StringUtils.hasText(detailItem.getStr("author")) && !StringUtils.hasText(target.getStr("author"))) {
                        target.set("author", detailItem.getStr("author"));
                    }
                    mergeNewspicFields(batchItem, target);
                }
            } else {
                target = JSONUtil.parseObj(detailItem.toString());
            }
            applyNewspicTypeFromSource(batchItem, target);
            merged.add(target);
        }
        return merged;
    }

    private void applyNewspicTypeFromSource(JSONObject source, JSONObject target) {
        if (source == null || target == null) {
            return;
        }
        if ("newspic".equalsIgnoreCase(trim(source.getStr("article_type")))) {
            target.set("article_type", "newspic");
        }
    }

    private void mergeNewspicFields(JSONObject source, JSONObject target) {
        if (source == null || target == null) {
            return;
        }
        if (isEmptyImageInfo(target) && !isEmptyImageInfo(source)) {
            target.set("image_info", source.getJSONObject("image_info"));
        }
        String sourceType = trim(source.getStr("article_type"));
        if ("newspic".equalsIgnoreCase(sourceType)) {
            target.set("article_type", "newspic");
        } else if (!StringUtils.hasText(target.getStr("article_type")) && StringUtils.hasText(sourceType)) {
            target.set("article_type", sourceType);
        }
        if (!StringUtils.hasText(target.getStr("thumb_media_id")) && StringUtils.hasText(source.getStr("thumb_media_id"))) {
            target.set("thumb_media_id", source.getStr("thumb_media_id"));
        }
        if (!StringUtils.hasText(target.getStr("thumb_url")) && StringUtils.hasText(source.getStr("thumb_url"))) {
            target.set("thumb_url", source.getStr("thumb_url"));
        }
    }

    private Map<String, JSONObject> buildNewspicIndex(List<JSONObject> publishedRecords) {
        Map<String, JSONObject> map = new LinkedHashMap<>();
        indexNewspicItems(map, buildDraftNewsItems());
        for (JSONObject record : publishedRecords) {
            JSONObject content = record.getJSONObject("content");
            JSONArray newsItems = content != null ? content.getJSONArray("news_item") : null;
            indexNewspicItems(map, newsItems);
        }
        log.info("贴图索引 {} 条（草稿+已发布 batch）", map.size());
        return map;
    }

    private List<JSONObject> buildDraftNewsItems() {
        List<JSONObject> items = new ArrayList<>();
        try {
            for (JSONObject record : weChatOfficialAccountClient.listAllDraftRecords()) {
                JSONObject content = record.getJSONObject("content");
                JSONArray newsItems = content != null ? content.getJSONArray("news_item") : null;
                if (newsItems == null) {
                    continue;
                }
                for (int i = 0; i < newsItems.size(); i++) {
                    JSONObject item = newsItems.getJSONObject(i);
                    if (item != null) {
                        items.add(item);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("拉取草稿箱贴图索引失败: {}", e.getMessage());
        }
        return items;
    }

    private void indexNewspicItems(Map<String, JSONObject> map, JSONArray newsItems) {
        if (newsItems == null || newsItems.isEmpty()) {
            return;
        }
        for (int i = 0; i < newsItems.size(); i++) {
            JSONObject item = newsItems.getJSONObject(i);
            if (item == null || !shouldIndexNewspicItem(item)) {
                continue;
            }
            putNewspicIndex(map, trim(item.getStr("title")), item);
        }
    }

    private void indexNewspicItems(Map<String, JSONObject> map, List<JSONObject> items) {
        for (JSONObject item : items) {
            if (item == null || !shouldIndexNewspicItem(item)) {
                continue;
            }
            putNewspicIndex(map, trim(item.getStr("title")), item);
        }
    }

    private boolean shouldIndexNewspicItem(JSONObject item) {
        if ("newspic".equalsIgnoreCase(trim(item.getStr("article_type")))) {
            return true;
        }
        return !isEmptyImageInfo(item);
    }

    private void putNewspicIndex(Map<String, JSONObject> map, String title, JSONObject item) {
        if (!StringUtils.hasText(title)) {
            return;
        }
        map.putIfAbsent(title, item);
        String normalized = normalizeTitleKey(title);
        if (StringUtils.hasText(normalized)) {
            map.putIfAbsent(normalized, item);
        }
    }

    private String normalizeTitleKey(String title) {
        if (!StringUtils.hasText(title)) {
            return "";
        }
        return title
                .replaceAll("[\\p{So}\\p{Cn}]", "")
                .replaceAll("\\s+", "")
                .trim()
                .toLowerCase();
    }

    private void enrichNewsItemFromIndex(JSONObject item, Map<String, JSONObject> index) {
        if (item == null || index == null || index.isEmpty()) {
            return;
        }
        String title = trim(item.getStr("title"));
        if (!StringUtils.hasText(title)) {
            return;
        }
        JSONObject indexed = index.get(title);
        if (indexed == null) {
            indexed = index.get(normalizeTitleKey(title));
        }
        if (indexed == null) {
            return;
        }
        mergeNewspicFields(indexed, item);
        applyNewspicTypeFromSource(indexed, item);
    }

    private boolean isEmptyImageInfo(JSONObject item) {
        if (item == null) {
            return true;
        }
        JSONObject imageInfo = item.getJSONObject("image_info");
        if (imageInfo == null) {
            return true;
        }
        JSONArray imageList = imageInfo.getJSONArray("image_list");
        return imageList == null || imageList.isEmpty();
    }

    private SyncAction upsertPublishedItem(
            JSONObject item,
            String articleId,
            int index,
            Long categoryId,
            boolean publish,
            LocalDateTime publishedAt,
            SyncScope syncScope,
            Map<String, String> imageCache,
            Map<String, byte[]> mediaCache,
            WeChatContentSyncResultVO result,
            LocalDateTime importTime) {
        boolean newspic = isNewspic(item);
        if (syncScope == SyncScope.NEWSPIC && !newspic) {
            result.setTypeFiltered(result.getTypeFiltered() + 1);
            return SyncAction.TYPE_FILTERED;
        }
        if (syncScope == SyncScope.NEWS && newspic) {
            result.setTypeFiltered(result.getTypeFiltered() + 1);
            return SyncAction.TYPE_FILTERED;
        }
        if (newspic) {
            SyncAction action = upsertNewspicNote(
                    item, articleId, index, categoryId, publish, publishedAt, imageCache, mediaCache, importTime);
            if (action != SyncAction.SKIP) {
                result.setNoteCount(result.getNoteCount() + 1);
            }
            return action;
        }
        SyncAction action = upsertNewsArticle(
                item, articleId, index, categoryId, publish, publishedAt, imageCache, importTime, result);
        if (action != SyncAction.SKIP) {
            result.setArticleCount(result.getArticleCount() + 1);
        }
        return action;
    }

    private enum SyncAction {
        CREATE, UPDATE, SKIP, TYPE_FILTERED
    }

    private enum SyncScope {
        ALL, NEWSPIC, NEWS;

        static SyncScope from(String raw) {
            if (!StringUtils.hasText(raw)) {
                return ALL;
            }
            return switch (raw.trim().toLowerCase()) {
                case "newspic", "note", "贴图" -> NEWSPIC;
                case "news", "article", "文章", "长文" -> NEWS;
                default -> ALL;
            };
        }

        String label() {
            return switch (this) {
                case NEWSPIC -> "仅贴图";
                case NEWS -> "仅文章";
                default -> "贴图+文章";
            };
        }
    }

    private SyncAction upsertNewsArticle(
            JSONObject item,
            String articleId,
            int index,
            Long categoryId,
            boolean publish,
            LocalDateTime publishedAt,
            Map<String, String> imageCache,
            LocalDateTime importTime,
            WeChatContentSyncResultVO result) {

        if (Boolean.TRUE.equals(item.getBool("is_deleted"))) {
            return SyncAction.SKIP;
        }

        String title = resolveTitle(item, articleId, index);
        if (!StringUtils.hasText(title)) {
            return SyncAction.SKIP;
        }

        Content entity = loadOrCreate(articleId, index, title);
        boolean isCreate = entity.getId() == null;

        entity.setTitle(title.length() > 128 ? title.substring(0, 128) : title);
        entity.setContentType("article");
        entity.setAuthor(trim(item.getStr("author")));
        entity.setSource(SOURCE_LABEL);
        entity.setExternalSource(EXTERNAL_SOURCE);
        entity.setExternalId(buildExternalId(articleId, index, title));

        String digest = trim(item.getStr("digest"));
        entity.setSummary(StringUtils.hasText(digest)
                ? (digest.length() > 512 ? digest.substring(0, 512) : digest)
                : entity.getTitle());

        String thumbUrl = trim(item.getStr("thumb_url"));
        if (StringUtils.hasText(thumbUrl)) {
            entity.setCoverImage(mirrorRemoteImage(thumbUrl, imageCache));
        }
        entity.setImages(null);

        String html = item.getStr("content");
        if (StringUtils.hasText(html)) {
            entity.setContent(rewriteHtmlImages(html, imageCache));
            applyWechatSpecialElementHints(entity, entity.getTitle(), result);
        } else if (!StringUtils.hasText(entity.getContent())) {
            entity.setContent(buildFallbackHtml(entity.getTitle(), entity.getSummary(), item.getStr("url")));
        }

        appendOriginalLink(entity, item.getStr("url"), item.getStr("content_source_url"));
        applyCommonFields(entity, articleId, categoryId, publish, publishedAt, "news");

        return persist(entity, isCreate, importTime);
    }

    private SyncAction upsertNewspicNote(
            JSONObject item,
            String articleId,
            int index,
            Long categoryId,
            boolean publish,
            LocalDateTime publishedAt,
            Map<String, String> imageCache,
            Map<String, byte[]> mediaCache,
            LocalDateTime importTime) {

        if (Boolean.TRUE.equals(item.getBool("is_deleted"))) {
            return SyncAction.SKIP;
        }

        String title = resolveTitle(item, articleId, index);
        List<String> imageUrls = collectNewspicImages(item, imageCache, mediaCache);
        if (imageUrls.isEmpty()) {
            log.warn("贴图无可用图片，跳过 articleId={} idx={}", articleId, index);
            return SyncAction.SKIP;
        }

        Content entity = loadOrCreate(articleId, index, title);
        boolean isCreate = entity.getId() == null;

        entity.setTitle(title.length() > 128 ? title.substring(0, 128) : title);
        entity.setContentType("note");
        entity.setAuthor(trim(item.getStr("author")));
        entity.setSource(SOURCE_LABEL);
        entity.setExternalSource(EXTERNAL_SOURCE);
        entity.setExternalId(buildExternalId(articleId, index, title));
        entity.setImages(toJson(imageUrls));
        entity.setCoverImage(imageUrls.get(0));

        String plainText = resolveNewspicPlainText(item);
        String digest = trim(item.getStr("digest"));
        if (!StringUtils.hasText(plainText) && StringUtils.hasText(digest)) {
            plainText = extractPlainText(digest);
        }
        // 贴图正文常比 digest 短，优先用较短者作为笔记文案
        if (StringUtils.hasText(digest)) {
            String digestPlain = extractPlainText(digest);
            if (StringUtils.hasText(digestPlain) && digestPlain.length() < plainText.length()) {
                plainText = digestPlain;
            }
        }
        entity.setSummary(StringUtils.hasText(plainText)
                ? (plainText.length() > 512 ? plainText.substring(0, 512) : plainText)
                : entity.getTitle());
        entity.setContent(buildNoteHtml(plainText));
        appendOriginalLink(entity, item.getStr("url"), item.getStr("content_source_url"));
        applyCommonFields(entity, articleId, categoryId, publish, publishedAt, "newspic");

        return persist(entity, isCreate, importTime);
    }

    private Content loadOrCreate(String articleId, int index, String title) {
        String externalId = buildExternalId(articleId, index, title);
        Content existing = contentMapper.selectOne(new LambdaQueryWrapper<Content>()
                .eq(Content::getExternalSource, EXTERNAL_SOURCE)
                .eq(Content::getExternalId, externalId)
                .last("LIMIT 1"));
        return existing != null ? existing : new Content();
    }

    private void applyCommonFields(
            Content entity,
            String articleId,
            Long categoryId,
            boolean publish,
            LocalDateTime publishedAt,
            String wxType) {
        if (categoryId != null) {
            entity.setCategoryId(categoryId);
        }

        List<String> tags = new ArrayList<>();
        tags.add(SOURCE_LABEL);
        tags.add("wx-type:" + wxType);
        if (StringUtils.hasText(articleId)) {
            tags.add("wx:" + articleId);
            tags.add("wx-batch:" + articleId);
        }
        entity.setTags(toJson(tags));

        if (publish) {
            entity.setStatus("published");
            if (publishedAt != null) {
                entity.setPublishedAt(publishedAt);
            } else if (entity.getPublishedAt() == null) {
                entity.setPublishedAt(LocalDateTime.now());
            }
        } else {
            entity.setStatus("draft");
            entity.setPublishedAt(null);
        }

        if (entity.getViewCount() == null) {
            entity.setViewCount(0);
        }
        if (entity.getLikeCount() == null) {
            entity.setLikeCount(0);
        }
        if (entity.getFavoriteCount() == null) {
            entity.setFavoriteCount(0);
        }
        if (entity.getSortOrder() == null) {
            entity.setSortOrder(0);
        }
    }

    private SyncAction persist(Content entity, boolean isCreate, LocalDateTime importTime) {
        entity.setUpdateTime(importTime);
        if (isCreate) {
            entity.setCreateTime(importTime);
            contentMapper.insert(entity);
            return SyncAction.CREATE;
        }
        contentMapper.updateById(entity);
        return SyncAction.UPDATE;
    }

    private boolean isNewspic(JSONObject item) {
        String articleType = trim(item.getStr("article_type"));
        if ("newspic".equalsIgnoreCase(articleType)) {
            return true;
        }

        JSONObject imageInfo = item.getJSONObject("image_info");
        JSONArray imageList = imageInfo != null ? imageInfo.getJSONArray("image_list") : null;
        if (imageList != null && !imageList.isEmpty()) {
            return true;
        }

        if ("news".equalsIgnoreCase(articleType)) {
            return false;
        }

        String content = item.getStr("content");
        // 已发布接口可能不返回 article_type；贴图正文是纯文本，出现富文本结构或正文图片时应判为文章。
        if (isRichArticleContent(content)) {
            return false;
        }
        String plain = resolveNewspicPlainText(item);
        List<String> htmlImages = extractImageUrlsFromHtml(content);
        String title = trim(item.getStr("title"));
        boolean hasThumb = StringUtils.hasText(item.getStr("thumb_url"))
                || StringUtils.hasText(item.getStr("thumb_media_id"));

        if (hasThumb && isNewspicStyleContent(content, plain)) {
            return true;
        }

        if (htmlImages.size() >= 1 && htmlImages.size() <= 20 && plain.length() <= 1200 && hasThumb) {
            return true;
        }

        if (htmlImages.size() >= 2 && plain.length() <= 800) {
            return true;
        }
        if (htmlImages.size() >= 1 && plain.length() <= 300) {
            return true;
        }

        if (!StringUtils.hasText(content) && hasThumb) {
            return plain.length() <= 680 || !StringUtils.hasText(plain);
        }

        if (htmlImages.isEmpty() && hasThumb) {
            if (plain.length() > 0 && plain.length() <= 680) {
                return true;
            }
            if (plain.length() <= 800 && StringUtils.hasText(title) && NOTE_TITLE_HINT.matcher(title).find()) {
                return true;
            }
        }

        return false;
    }

    private boolean isRichArticleContent(String content) {
        if (!StringUtils.hasText(content)) {
            return false;
        }
        String html = content.toLowerCase();
        return html.contains("<section")
                || html.contains("<img")
                || html.contains("<table")
                || html.contains("<blockquote")
                || html.matches("(?s).*<h[1-6]\\b.*")
                || html.contains("data-tools")
                || html.contains("rich_pages");
    }

    private String resolveNewspicPlainText(JSONObject item) {
        String digestPlain = extractPlainText(item.getStr("digest"));
        String contentPlain = extractPlainText(item.getStr("content"));
        if (StringUtils.hasText(digestPlain) && digestPlain.length() <= 800) {
            if (!StringUtils.hasText(contentPlain) || digestPlain.length() <= contentPlain.length()) {
                return digestPlain;
            }
        }
        return contentPlain;
    }

    private boolean isNewspicStyleContent(String content, String plain) {
        if (!StringUtils.hasText(content)) {
            return plain.length() <= 1200;
        }
        String html = content.trim();
        if (html.contains("<section") || html.contains("data-tools") || html.contains("rich_pages")) {
            return plain.length() <= 600;
        }
        int paragraphCount = 0;
        Matcher matcher = Pattern.compile("<p\\b", Pattern.CASE_INSENSITIVE).matcher(html);
        while (matcher.find()) {
            paragraphCount++;
        }
        if (paragraphCount >= 8 && plain.length() > 700) {
            return false;
        }
        if (!html.contains("<img") && plain.length() <= 1200) {
            return true;
        }
        return plain.length() <= 600;
    }

    private List<String> collectNewspicImages(
            JSONObject item,
            Map<String, String> imageCache,
            Map<String, byte[]> mediaCache) {
        LinkedHashMap<String, String> ordered = new LinkedHashMap<>();

        JSONObject imageInfo = item.getJSONObject("image_info");
        JSONArray imageList = imageInfo != null ? imageInfo.getJSONArray("image_list") : null;
        if (imageList != null && !imageList.isEmpty()) {
            for (int i = 0; i < imageList.size(); i++) {
                JSONObject image = imageList.getJSONObject(i);
                if (image == null) {
                    continue;
                }
                String mediaId = trim(image.getStr("image_media_id"));
                if (StringUtils.hasText(mediaId)) {
                    String localUrl = mirrorMediaId(mediaId, mediaCache, imageCache);
                    if (StringUtils.hasText(localUrl)) {
                        ordered.putIfAbsent("media:" + mediaId, localUrl);
                        continue;
                    }
                }
                String url = firstNonBlank(
                        image.getStr("image_url"),
                        image.getStr("url"),
                        image.getStr("thumb_url"));
                if (StringUtils.hasText(url)) {
                    ordered.putIfAbsent(url, mirrorRemoteImage(url, imageCache));
                }
            }
        }

        if (ordered.isEmpty()) {
            String thumbMediaId = trim(item.getStr("thumb_media_id"));
            if (StringUtils.hasText(thumbMediaId)) {
                String localUrl = mirrorMediaId(thumbMediaId, mediaCache, imageCache);
                if (StringUtils.hasText(localUrl)) {
                    ordered.put("media:" + thumbMediaId, localUrl);
                }
            }
            String thumbUrl = trim(item.getStr("thumb_url"));
            if (StringUtils.hasText(thumbUrl)) {
                ordered.putIfAbsent(thumbUrl, mirrorRemoteImage(thumbUrl, imageCache));
            }
            for (String url : extractImageUrlsFromHtml(item.getStr("content"))) {
                ordered.putIfAbsent(url, mirrorRemoteImage(url, imageCache));
            }
        }

        return new ArrayList<>(ordered.values());
    }

    private String mirrorMediaId(String mediaId, Map<String, byte[]> mediaCache, Map<String, String> imageCache) {
        if (imageCache.containsKey("media:" + mediaId)) {
            return imageCache.get("media:" + mediaId);
        }
        try {
            byte[] bytes = mediaCache.computeIfAbsent(mediaId, weChatOfficialAccountClient::downloadPermanentImage);
            if (bytes == null || bytes.length == 0) {
                return null;
            }
            UploadResultVO uploaded = fileUploadService.uploadBytes(bytes, mediaId + ".jpg", "wechat-oa");
            String localUrl = uploaded.getUrl();
            imageCache.put("media:" + mediaId, localUrl);
            return localUrl;
        } catch (Exception e) {
            log.warn("转存永久素材失败 mediaId={}: {}", mediaId, e.getMessage());
            return null;
        }
    }

    private List<String> extractImageUrlsFromHtml(String html) {
        List<String> urls = new ArrayList<>();
        if (!StringUtils.hasText(html)) {
            return urls;
        }
        Matcher matcher = IMG_SRC_PATTERN.matcher(html);
        while (matcher.find()) {
            String src = trim(matcher.group(3));
            if (StringUtils.hasText(src) && !urls.contains(src)) {
                urls.add(src);
            }
        }
        return urls;
    }

    /** R5：标记 iframe / style 等微信特有元素；尝试提取 iframe 视频直链 */
    private void applyWechatSpecialElementHints(Content entity, String title, WeChatContentSyncResultVO result) {
        if (entity == null || result == null) {
            return;
        }
        String html = entity.getContent();
        if (!StringUtils.hasText(html)) {
            return;
        }
        List<String> hints = new ArrayList<>();
        if (html.toLowerCase().contains("<iframe") || html.toLowerCase().contains("<mpvoice")) {
            hints.add("内嵌视频/音频");
            if (!StringUtils.hasText(entity.getVideoUrl())) {
                Matcher iframe = IFRAME_SRC_PATTERN.matcher(html);
                if (iframe.find()) {
                    entity.setVideoUrl(trim(iframe.group(1)));
                }
            }
        }
        if (STYLE_BLOCK_PATTERN.matcher(html).find()) {
            hints.add("style 块样式");
        }
        if (!hints.isEmpty()) {
            result.getFailures().add(new WeChatContentSyncResultVO.FailureItem(
                    StringUtils.hasText(title) ? title : "未命名",
                    "含微信特有元素，建议人工处理：" + String.join("、", hints)));
        }
    }

    private String extractPlainText(String html) {
        if (!StringUtils.hasText(html)) {
            return "";
        }
        String text = HTML_TAG_PATTERN.matcher(html).replaceAll("");
        return text.replace("&nbsp;", " ").replaceAll("\\s+", " ").trim();
    }

    private String buildNoteHtml(String plainText) {
        StringBuilder sb = new StringBuilder();
        if (StringUtils.hasText(plainText)) {
            for (String line : plainText.split("\\n+")) {
                if (StringUtils.hasText(line)) {
                    sb.append("<p>").append(escapeHtml(line.trim())).append("</p>");
                }
            }
        }
        return sb.toString();
    }

    private String resolveTitle(JSONObject item, String articleId, int index) {
        String title = trim(item.getStr("title"));
        if (StringUtils.hasText(title)) {
            return title;
        }
        if (StringUtils.hasText(articleId)) {
            return "公众号内容 " + articleId.substring(0, Math.min(8, articleId.length())) + "-" + (index + 1);
        }
        return "公众号内容-" + (index + 1);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return "";
    }

    private String buildExternalId(String articleId, int index, String title) {
        if (StringUtils.hasText(articleId)) {
            return articleId + "_" + index;
        }
        return "title_" + Math.abs(title.hashCode()) + "_" + index;
    }

    private void appendOriginalLink(Content entity, String url, String sourceUrl) {
        // 原文 URL 已记录在 external_id / 导入来源，不再写入正文，避免底部多余链接
    }

    private String buildFallbackHtml(String title, String summary, String url) {
        StringBuilder sb = new StringBuilder();
        sb.append("<h2>").append(escapeHtml(title)).append("</h2>");
        if (StringUtils.hasText(summary)) {
            sb.append("<p>").append(escapeHtml(summary)).append("</p>");
        }
        if (StringUtils.hasText(url)) {
            sb.append("<p><a href=\"").append(escapeHtml(url)).append("\" target=\"_blank\">查看微信原文</a></p>");
        }
        return sb.toString();
    }

    private String rewriteHtmlImages(String html, Map<String, String> imageCache) {
        return rewriteHtmlImages(html, imageCache, "wechat-oa");
    }

    private String rewriteHtmlImages(String html, Map<String, String> imageCache, String uploadFolder) {
        if (!StringUtils.hasText(html)) {
            return html;
        }
        Matcher matcher = IMG_SRC_PATTERN.matcher(html);
        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            String prefix = matcher.group(1);
            String eq = matcher.group(2);
            String src = matcher.group(3);
            String suffix = matcher.group(4);
            String mirrored = mirrorRemoteImage(src, imageCache, uploadFolder);
            String replacement = prefix + "src" + eq + mirrored + suffix;
            matcher.appendReplacement(sb, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    private String mirrorRemoteImage(String remoteUrl, Map<String, String> imageCache) {
        return mirrorRemoteImage(remoteUrl, imageCache, "wechat-oa");
    }

    private String mirrorRemoteImage(String remoteUrl, Map<String, String> imageCache, String uploadFolder) {
        if (!StringUtils.hasText(remoteUrl)) {
            return remoteUrl;
        }
        if (remoteUrl.startsWith("/uploads/") || remoteUrl.contains("/uploads/")) {
            return remoteUrl;
        }
        if (imageCache.containsKey(remoteUrl)) {
            return imageCache.get(remoteUrl);
        }
        try {
            HttpResponse response = HttpRequest.get(remoteUrl)
                    .timeout(20_000)
                    .header("User-Agent", "Mozilla/5.0 MiniProgramPlatform/1.0")
                    .header("Referer", "https://mp.weixin.qq.com/")
                    .execute();
            if (!response.isOk()) {
                log.warn("下载微信图片失败 {} -> HTTP {}", remoteUrl, response.getStatus());
                return remoteUrl;
            }
            byte[] bytes = response.bodyBytes();
            if (bytes == null || bytes.length == 0) {
                return remoteUrl;
            }
            String fileName = guessFileName(remoteUrl, response.header("Content-Type"));
            UploadResultVO uploaded = fileUploadService.uploadBytes(bytes, fileName, uploadFolder);
            String localUrl = uploaded.getUrl();
            imageCache.put(remoteUrl, localUrl);
            return localUrl;
        } catch (Exception e) {
            log.warn("转存微信图片失败 {}: {}", remoteUrl, e.getMessage());
            return remoteUrl;
        }
    }

    private String guessFileName(String remoteUrl, String contentType) {
        try {
            String path = URI.create(remoteUrl).getPath();
            if (StringUtils.hasText(path) && path.contains(".")) {
                return path.substring(path.lastIndexOf('/') + 1);
            }
        } catch (Exception ignored) {
            // ignore
        }
        if (StringUtils.hasText(contentType) && contentType.contains("png")) {
            return "wechat.png";
        }
        if (StringUtils.hasText(contentType) && contentType.contains("gif")) {
            return "wechat.gif";
        }
        if (StringUtils.hasText(contentType) && contentType.contains("webp")) {
            return "wechat.webp";
        }
        return "wechat.jpg";
    }

    private LocalDateTime toLocalDateTime(long epochSeconds) {
        if (epochSeconds <= 0) {
            return LocalDateTime.now();
        }
        return LocalDateTime.ofInstant(Instant.ofEpochSecond(epochSeconds), ZoneId.systemDefault());
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private String escapeHtml(String input) {
        if (input == null) {
            return "";
        }
        return input
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private String toJson(List<String> tags) {
        try {
            return objectMapper.writeValueAsString(tags);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }
}
