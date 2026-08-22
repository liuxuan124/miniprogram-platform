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
import com.miniprogram.dto.wechat.WeChatContentSyncRequestDTO;
import com.miniprogram.dto.wechat.WeChatContentSyncResultVO;
import com.miniprogram.entity.Content;
import com.miniprogram.mapper.ContentMapper;
import com.miniprogram.service.ContentCategoryService;
import com.miniprogram.service.FileUploadService;
import com.miniprogram.service.WeChatOfficialAccountClient;
import com.miniprogram.service.WeChatOfficialAccountContentSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
    private static final String SOURCE_LABEL = "微信公众号";
    private static final Pattern IMG_SRC_PATTERN = Pattern.compile(
            "(<img[^>]*?\\s(?:src|data-src)\\s*=\\s*[\"'])([^\"']+)([\"'][^>]*>)",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern HTML_TAG_PATTERN = Pattern.compile("<[^>]+>");
    /** 已发布接口无 image_info 时，用标题特征辅助识别贴图 */
    private static final Pattern NOTE_TITLE_HINT = Pattern.compile(
            "一张图|一图|图解|地图|海报|图看懂|图讲透|结构拆解|流程图|思维导图|合规SOP|财税地图",
            Pattern.CASE_INSENSITIVE);

    private final WeChatOfficialAccountClient weChatOfficialAccountClient;
    private final ContentMapper contentMapper;
    private final ContentCategoryService categoryService;
    private final FileUploadService fileUploadService;
    private final ObjectMapper objectMapper;

    @Override
    public WeChatContentSyncResultVO syncAllPublished(WeChatContentSyncRequestDTO request) {
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
                item, articleId, index, categoryId, publish, publishedAt, imageCache, importTime);
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
            LocalDateTime importTime) {

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
            String src = trim(matcher.group(2));
            if (StringUtils.hasText(src) && !urls.contains(src)) {
                urls.add(src);
            }
        }
        return urls;
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
        String link = StringUtils.hasText(url) ? url : sourceUrl;
        if (!StringUtils.hasText(link)) {
            return;
        }
        String footer = "<p style=\"margin-top:16px;color:#888;font-size:12px;\">"
                + "原文链接：<a href=\"" + escapeHtml(link) + "\" target=\"_blank\" rel=\"noopener noreferrer\">"
                + escapeHtml(link) + "</a></p>";
        String content = entity.getContent();
        entity.setContent((StringUtils.hasText(content) ? content : "") + footer);
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
        if (!StringUtils.hasText(html)) {
            return html;
        }
        Matcher matcher = IMG_SRC_PATTERN.matcher(html);
        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            String prefix = matcher.group(1);
            String src = matcher.group(2);
            String suffix = matcher.group(3);
            String mirrored = mirrorRemoteImage(src, imageCache);
            matcher.appendReplacement(sb, Matcher.quoteReplacement(prefix + mirrored + suffix));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    private String mirrorRemoteImage(String remoteUrl, Map<String, String> imageCache) {
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
            UploadResultVO uploaded = fileUploadService.uploadBytes(bytes, fileName, "wechat-oa");
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
