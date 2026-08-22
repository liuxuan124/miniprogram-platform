package com.miniprogram.service.impl;

import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
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

    private final WeChatOfficialAccountClient weChatOfficialAccountClient;
    private final ContentMapper contentMapper;
    private final ContentCategoryService categoryService;
    private final FileUploadService fileUploadService;
    private final ObjectMapper objectMapper;

    @Override
    public WeChatContentSyncResultVO syncAllPublished(WeChatContentSyncRequestDTO request) {
        WeChatContentSyncRequestDTO safeRequest = request != null ? request : new WeChatContentSyncRequestDTO();
        boolean publish = safeRequest.getPublish() == null || Boolean.TRUE.equals(safeRequest.getPublish());
        Long categoryId = safeRequest.getCategoryId();
        if (categoryId != null) {
            if (categoryService.getById(categoryId) == null) {
                throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "分类不存在");
            }
        }

        WeChatContentSyncResultVO result = new WeChatContentSyncResultVO();
        List<JSONObject> records = weChatOfficialAccountClient.listAllPublishedRecords();
        result.setTotalPublishRecords(records.size());

        Map<String, String> imageCache = new LinkedHashMap<>();
        Map<String, byte[]> mediaCache = new LinkedHashMap<>();
        int articlesProcessed = 0;

        for (JSONObject record : records) {
            String articleId = record.getStr("article_id");
            JSONObject contentWrapper = record.getJSONObject("content");
            JSONArray newsItems = contentWrapper != null ? contentWrapper.getJSONArray("news_item") : null;

            if ((newsItems == null || newsItems.isEmpty()) && StringUtils.hasText(articleId)) {
                try {
                    JSONObject detail = weChatOfficialAccountClient.getPublishedArticle(articleId);
                    newsItems = detail.getJSONArray("news_item");
                } catch (Exception e) {
                    log.warn("拉取 article_id={} 详情失败: {}", articleId, e.getMessage());
                    result.setFailed(result.getFailed() + 1);
                    result.getFailures().add(new WeChatContentSyncResultVO.FailureItem(
                            articleId, e.getMessage()));
                    continue;
                }
            }

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
                articlesProcessed++;
                try {
                    SyncAction action = upsertPublishedItem(
                            item, articleId, i, categoryId, publish, publishedAt, imageCache, mediaCache, result);
                    switch (action) {
                        case CREATE -> result.setCreated(result.getCreated() + 1);
                        case UPDATE -> result.setUpdated(result.getUpdated() + 1);
                        case SKIP -> result.setSkipped(result.getSkipped() + 1);
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
                "共同步 %d 条：长文 %d，贴图 %d；新建 %d，更新 %d，跳过 %d，失败 %d",
                result.getTotalArticles(),
                result.getArticleCount(),
                result.getNoteCount(),
                result.getCreated(),
                result.getUpdated(),
                result.getSkipped(),
                result.getFailed()));
        return result;
    }

    private SyncAction upsertPublishedItem(
            JSONObject item,
            String articleId,
            int index,
            Long categoryId,
            boolean publish,
            LocalDateTime publishedAt,
            Map<String, String> imageCache,
            Map<String, byte[]> mediaCache,
            WeChatContentSyncResultVO result) {
        if (isNewspic(item)) {
            SyncAction action = upsertNewspicNote(
                    item, articleId, index, categoryId, publish, publishedAt, imageCache, mediaCache);
            if (action != SyncAction.SKIP) {
                result.setNoteCount(result.getNoteCount() + 1);
            }
            return action;
        }
        SyncAction action = upsertNewsArticle(
                item, articleId, index, categoryId, publish, publishedAt, imageCache);
        if (action != SyncAction.SKIP) {
            result.setArticleCount(result.getArticleCount() + 1);
        }
        return action;
    }

    private enum SyncAction {
        CREATE, UPDATE, SKIP
    }

    private SyncAction upsertNewsArticle(
            JSONObject item,
            String articleId,
            int index,
            Long categoryId,
            boolean publish,
            LocalDateTime publishedAt,
            Map<String, String> imageCache) {

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

        return persist(entity, isCreate);
    }

    private SyncAction upsertNewspicNote(
            JSONObject item,
            String articleId,
            int index,
            Long categoryId,
            boolean publish,
            LocalDateTime publishedAt,
            Map<String, String> imageCache,
            Map<String, byte[]> mediaCache) {

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

        String plainText = extractPlainText(item.getStr("content"));
        String digest = trim(item.getStr("digest"));
        if (!StringUtils.hasText(plainText) && StringUtils.hasText(digest)) {
            plainText = digest;
        }
        entity.setSummary(StringUtils.hasText(plainText)
                ? (plainText.length() > 512 ? plainText.substring(0, 512) : plainText)
                : entity.getTitle());
        entity.setContent(buildNoteHtml(plainText, imageUrls));
        appendOriginalLink(entity, item.getStr("url"), item.getStr("content_source_url"));
        applyCommonFields(entity, articleId, categoryId, publish, publishedAt, "newspic");

        return persist(entity, isCreate);
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
            entity.setPublishedAt(publishedAt != null ? publishedAt : LocalDateTime.now());
        } else if (!StringUtils.hasText(entity.getStatus())) {
            entity.setStatus("draft");
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

    private SyncAction persist(Content entity, boolean isCreate) {
        if (isCreate) {
            contentMapper.insert(entity);
            return SyncAction.CREATE;
        }
        contentMapper.updateById(entity);
        return SyncAction.UPDATE;
    }

    private boolean isNewspic(JSONObject item) {
        if ("newspic".equalsIgnoreCase(trim(item.getStr("article_type")))) {
            return true;
        }
        JSONObject imageInfo = item.getJSONObject("image_info");
        JSONArray imageList = imageInfo != null ? imageInfo.getJSONArray("image_list") : null;
        if (imageList != null && !imageList.isEmpty()) {
            return true;
        }
        String content = item.getStr("content");
        if (!StringUtils.hasText(content)) {
            return false;
        }
        List<String> htmlImages = extractImageUrlsFromHtml(content);
        String plain = extractPlainText(content);
        return htmlImages.size() >= 2 && plain.length() <= 300;
    }

    private List<String> collectNewspicImages(
            JSONObject item,
            Map<String, String> imageCache,
            Map<String, byte[]> mediaCache) {
        LinkedHashMap<String, String> ordered = new LinkedHashMap<>();

        JSONObject imageInfo = item.getJSONObject("image_info");
        JSONArray imageList = imageInfo != null ? imageInfo.getJSONArray("image_list") : null;
        if (imageList != null) {
            for (int i = 0; i < imageList.size(); i++) {
                JSONObject image = imageList.getJSONObject(i);
                if (image == null) {
                    continue;
                }
                String url = firstNonBlank(
                        image.getStr("image_url"),
                        image.getStr("url"),
                        image.getStr("thumb_url"));
                if (StringUtils.hasText(url)) {
                    ordered.putIfAbsent(url, mirrorRemoteImage(url, imageCache));
                    continue;
                }
                String mediaId = image.getStr("image_media_id");
                if (StringUtils.hasText(mediaId)) {
                    String localUrl = mirrorMediaId(mediaId, mediaCache, imageCache);
                    if (StringUtils.hasText(localUrl)) {
                        ordered.putIfAbsent(localUrl, localUrl);
                    }
                }
            }
        }

        for (String url : extractImageUrlsFromHtml(item.getStr("content"))) {
            ordered.putIfAbsent(url, mirrorRemoteImage(url, imageCache));
        }

        String thumbUrl = trim(item.getStr("thumb_url"));
        if (StringUtils.hasText(thumbUrl)) {
            ordered.putIfAbsent(thumbUrl, mirrorRemoteImage(thumbUrl, imageCache));
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

    private String buildNoteHtml(String plainText, List<String> imageUrls) {
        StringBuilder sb = new StringBuilder();
        if (StringUtils.hasText(plainText)) {
            for (String line : plainText.split("\\n+")) {
                if (StringUtils.hasText(line)) {
                    sb.append("<p>").append(escapeHtml(line.trim())).append("</p>");
                }
            }
        }
        for (String imageUrl : imageUrls) {
            sb.append("<p><img src=\"").append(escapeHtml(imageUrl)).append("\" alt=\"\" /></p>");
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
