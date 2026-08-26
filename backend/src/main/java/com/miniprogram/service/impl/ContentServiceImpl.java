package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.ContentAttachmentDTO;
import com.miniprogram.dto.ContentDTO;
import com.miniprogram.dto.ContentDetailDTO;
import com.miniprogram.dto.ContentQueryDTO;
import com.miniprogram.entity.Content;
import com.miniprogram.entity.ContentTag;
import com.miniprogram.mapper.ContentMapper;
import com.miniprogram.mapper.ContentTagMapper;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.ContentCategoryService;
import com.miniprogram.service.ContentService;
import com.miniprogram.service.FileEntitlementService;
import com.miniprogram.util.ContentSourceResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * 内容文章 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContentServiceImpl extends BaseServiceImpl<ContentMapper, Content>
        implements ContentService {

    private final ContentCategoryService categoryService;
    private final ContentTagMapper tagMapper;
    private final ObjectMapper objectMapper;
    private final FileEntitlementService fileEntitlementService;

    @Override
    public PageResult<ContentDetailDTO> listContents(ContentQueryDTO queryDTO) {
        LambdaQueryWrapper<Content> wrapper = buildQueryWrapper(queryDTO);
        wrapper.orderByAsc(Content::getSortOrder);
        wrapper.orderByDesc(Content::getUpdateTime);
        wrapper.orderByDesc(Content::getId);

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<Content> page =
                this.page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(
                        queryDTO.getCurrent(), queryDTO.getSize()), wrapper);

        List<ContentDetailDTO> records = page.getRecords().stream()
                .map(this::toDetailDTO)
                .toList();

        return new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ContentDetailDTO createContent(ContentDTO dto) {
        // 校验分类是否存在
        validateCategory(dto.getCategoryId());

        Content entity = new Content();
        BeanUtils.copyProperties(dto, entity);
        entity.setTags(toJsonString(dto.getTags()));
        entity.setImages(toJsonString(dto.getImages()));
        applyAttachments(entity, dto.getAttachments());
        if (!StringUtils.hasText(entity.getContentType())) {
            entity.setContentType("article");
        }
        entity.setStatus("draft");
        entity.setViewCount(0);
        if (entity.getLikeCount() == null) {
            entity.setLikeCount(0);
        }
        if (entity.getFavoriteCount() == null) {
            entity.setFavoriteCount(0);
        }
        if (entity.getSortOrder() == null) {
            entity.setSortOrder(0);
        }
        if (entity.getIsPinned() == null) {
            entity.setIsPinned(0);
        }
        if (entity.getIsRecommended() == null) {
            entity.setIsRecommended(0);
        }
        if (!StringUtils.hasText(entity.getLayoutTheme())) {
            entity.setLayoutTheme("standard");
        }
        if ("note".equals(entity.getContentType()) && !StringUtils.hasText(entity.getCoverImage())
                && StringUtils.hasText(entity.getImages())) {
            List<String> imgs = parseStringList(entity.getImages());
            if (!imgs.isEmpty()) {
                entity.setCoverImage(imgs.get(0));
            }
        }
        applyMomentCover(entity);
        applyScheduleFields(entity, dto);
        this.save(entity);

        // 更新标签使用次数
        updateTagUseCount(dto.getTags(), true);

        return toDetailDTO(entity);
    }

    @Override
    public ContentDetailDTO getContentDetail(Long id) {
        Content entity = getExistingContent(id);
        return toDetailDTO(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ContentDetailDTO updateContent(Long id, ContentDTO dto) {
        Content entity = getExistingContent(id);

        // 校验分类是否存在
        validateCategory(dto.getCategoryId());

        // 获取旧标签列表，用于更新标签计数
        List<String> oldTags = parseTags(entity.getTags());

        if (dto.getTitle() != null) {
            entity.setTitle(dto.getTitle());
        }
        if (dto.getContentType() != null) {
            entity.setContentType(dto.getContentType());
        }
        if (dto.getCategoryId() != null) {
            entity.setCategoryId(dto.getCategoryId());
        }
        if (dto.getCoverImage() != null) {
            entity.setCoverImage(dto.getCoverImage());
        }
        if (dto.getVideoUrl() != null) {
            entity.setVideoUrl(dto.getVideoUrl());
        }
        if (dto.getVideoDuration() != null) {
            entity.setVideoDuration(dto.getVideoDuration());
        }
        if (dto.getImages() != null) {
            entity.setImages(toJsonString(dto.getImages()));
        }
        if (dto.getAttachments() != null) {
            applyAttachments(entity, dto.getAttachments());
        }
        if (dto.getSummary() != null) {
            entity.setSummary(dto.getSummary());
        }
        if (dto.getSeoTitle() != null) {
            entity.setSeoTitle(dto.getSeoTitle());
        }
        if (dto.getSeoDescription() != null) {
            entity.setSeoDescription(dto.getSeoDescription());
        }
        if (dto.getLayoutTheme() != null) {
            entity.setLayoutTheme(dto.getLayoutTheme());
        }
        if (dto.getScheduledAt() != null) {
            entity.setScheduledAt(parseScheduledAt(dto.getScheduledAt()));
        }
        if (dto.getContent() != null) {
            entity.setContent(dto.getContent());
        }
        if (dto.getAuthor() != null) {
            entity.setAuthor(dto.getAuthor());
        }
        if (dto.getAuthorAvatar() != null) {
            entity.setAuthorAvatar(dto.getAuthorAvatar());
        }
        if (dto.getSource() != null) {
            entity.setSource(dto.getSource());
        }
        if (dto.getTags() != null) {
            entity.setTags(toJsonString(dto.getTags()));
        }
        if (dto.getLikeCount() != null) {
            entity.setLikeCount(dto.getLikeCount());
        }
        if (dto.getFavoriteCount() != null) {
            entity.setFavoriteCount(dto.getFavoriteCount());
        }
        if (dto.getSortOrder() != null) {
            entity.setSortOrder(dto.getSortOrder());
        }
        if (dto.getIsPinned() != null) {
            entity.setIsPinned(dto.getIsPinned());
        }
        if (dto.getIsRecommended() != null) {
            entity.setIsRecommended(dto.getIsRecommended());
        }
        if ("note".equals(entity.getContentType()) && !StringUtils.hasText(entity.getCoverImage())) {
            List<String> imgs = parseStringList(entity.getImages());
            if (!imgs.isEmpty()) {
                entity.setCoverImage(imgs.get(0));
            }
        }
        applyMomentCover(entity);
        applyScheduleFields(entity, dto);
        this.updateById(entity);

        // 更新标签使用次数：旧标签-1，新标签+1
        List<String> newTags = dto.getTags() != null ? dto.getTags() : oldTags;
        updateTagUseCount(oldTags, false);
        updateTagUseCount(newTags, true);

        return toDetailDTO(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteContent(Long id) {
        Content entity = getExistingContent(id);

        // 更新标签使用次数
        List<String> tags = parseTags(entity.getTags());
        updateTagUseCount(tags, false);

        this.removeById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ContentDetailDTO publishContent(Long id) {
        Content entity = getExistingContent(id);

        if ("published".equals(entity.getStatus())) {
            throw new BusinessException(ErrorCode.CONTENT_STATUS_ERROR, "内容已发布，不可重复发布");
        }

        entity.setStatus("published");
        entity.setPublishedAt(LocalDateTime.now());
        entity.setScheduledAt(null);
        this.updateById(entity);

        return toDetailDTO(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ContentDetailDTO unpublishContent(Long id) {
        Content entity = getExistingContent(id);

        if (!"published".equals(entity.getStatus())) {
            throw new BusinessException(ErrorCode.CONTENT_STATUS_ERROR, "内容未发布，无法下架");
        }

        entity.setStatus("unpublished");
        entity.setPublishedAt(null);
        this.updateById(entity);

        return toDetailDTO(entity);
    }

    @Override
    public PageResult<ContentDetailDTO> listPublishedContents(ContentQueryDTO queryDTO) {
        // 小程序端只查询已发布内容
        ContentQueryDTO mpQuery = new ContentQueryDTO();
        mpQuery.setCurrent(queryDTO.getCurrent());
        mpQuery.setSize(queryDTO.getSize());
        mpQuery.setKeyword(queryDTO.getKeyword());
        mpQuery.setCategoryId(queryDTO.getCategoryId());
        mpQuery.setTag(queryDTO.getTag());
        mpQuery.setContentType(queryDTO.getContentType());
        mpQuery.setStatus("published");

        LambdaQueryWrapper<Content> wrapper = buildQueryWrapper(mpQuery);
        // 列表接口不查正文/附件大字段，避免小程序与预览拉取过慢
        wrapper.select(Content.class, info ->
                !"content".equals(info.getColumn()) && !"attachments".equals(info.getColumn()));
        wrapper.orderByAsc(Content::getSortOrder);
        wrapper.orderByDesc(Content::getPublishedAt);

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<Content> page =
                this.page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(
                        mpQuery.getCurrent(), mpQuery.getSize()), wrapper);

        List<ContentDetailDTO> records = page.getRecords().stream()
                .map(this::toListDTO)
                .toList();

        return new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ContentDetailDTO getPublishedContentDetail(Long id) {
        Content entity = this.getById(id);
        if (entity == null || !"published".equals(entity.getStatus())) {
            throw new BusinessException(ErrorCode.CONTENT_NOT_FOUND);
        }

        // 浏览量 +1
        entity.setViewCount(entity.getViewCount() + 1);
        this.updateById(entity);

        ContentDetailDTO dto = toDetailDTO(entity);
        dto.setAttachments(fileEntitlementService.enrichAttachments(
                dto.getAttachments(), SecurityUtils.getCurrentUserId()));
        return dto;
    }

    // ==================== 私有方法 ====================

    private Content getExistingContent(Long id) {
        Content entity = this.getById(id);
        if (entity == null) {
            throw new BusinessException(ErrorCode.CONTENT_NOT_FOUND);
        }
        return entity;
    }

    private void validateCategory(Long categoryId) {
        if (categoryId != null) {
            String name = categoryService.getCategoryName(categoryId);
            if (name == null) {
                throw new BusinessException(ErrorCode.CONTENT_CATEGORY_NOT_FOUND);
            }
        }
    }

    private LambdaQueryWrapper<Content> buildQueryWrapper(ContentQueryDTO queryDTO) {
        LambdaQueryWrapper<Content> wrapper = new LambdaQueryWrapper<>();
        wrapper.like(StringUtils.hasText(queryDTO.getKeyword()), Content::getTitle, queryDTO.getKeyword());
        wrapper.eq(queryDTO.getCategoryId() != null, Content::getCategoryId, queryDTO.getCategoryId());
        wrapper.eq(StringUtils.hasText(queryDTO.getStatus()), Content::getStatus, queryDTO.getStatus());
        wrapper.eq(StringUtils.hasText(queryDTO.getContentType()), Content::getContentType, queryDTO.getContentType());
        wrapper.eq(StringUtils.hasText(queryDTO.getSource()), Content::getSource, queryDTO.getSource());

        // 标签筛选（JSON字段模糊匹配）
        if (StringUtils.hasText(queryDTO.getTag())) {
            wrapper.like(Content::getTags, queryDTO.getTag());
        }

        return wrapper;
    }

    private ContentDetailDTO toDetailDTO(Content entity) {
        ContentDetailDTO dto = new ContentDetailDTO();
        BeanUtils.copyProperties(entity, dto);
        dto.setTags(parseTags(entity.getTags()));
        dto.setImages(parseStringList(entity.getImages()));
        dto.setAttachments(parseAttachments(entity.getAttachments()));
        dto.setAttachmentCount(entity.getAttachmentCount() != null ? entity.getAttachmentCount() : dto.getAttachments().size());
        dto.setCategoryName(categoryService.getCategoryName(entity.getCategoryId()));
        dto.setExternalSource(entity.getExternalSource());
        dto.setSource(ContentSourceResolver.resolvePlatformSource(entity));
        return dto;
    }

    /** 列表场景：不含正文与附件详情，减小响应体积 */
    private ContentDetailDTO toListDTO(Content entity) {
        ContentDetailDTO dto = toDetailDTO(entity);
        dto.setContent(null);
        dto.setAttachments(null);
        return dto;
    }

    private void applyAttachments(Content entity, List<ContentAttachmentDTO> attachments) {
        List<ContentAttachmentDTO> list = attachments != null ? attachments : Collections.emptyList();
        entity.setAttachments(toAttachmentsJson(list));
        entity.setAttachmentCount(list.size());
    }

    private void applyMomentCover(Content entity) {
        if (!"moment".equals(entity.getContentType()) || StringUtils.hasText(entity.getCoverImage())) {
            return;
        }
        List<String> imgs = parseStringList(entity.getImages());
        if (!imgs.isEmpty()) {
            entity.setCoverImage(imgs.get(0));
        }
    }

    private List<ContentAttachmentDTO> parseAttachments(String json) {
        if (!StringUtils.hasText(json)) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<ContentAttachmentDTO>>() {});
        } catch (JsonProcessingException e) {
            log.warn("附件 JSON 反序列化失败: {}", json, e);
            return Collections.emptyList();
        }
    }

    private String toAttachmentsJson(List<ContentAttachmentDTO> attachments) {
        if (attachments == null || attachments.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(attachments);
        } catch (JsonProcessingException e) {
            log.warn("附件序列化失败", e);
            return null;
        }
    }

    private List<String> parseStringList(String json) {
        if (!StringUtils.hasText(json)) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            log.warn("JSON 数组反序列化失败: {}", json, e);
            return Collections.emptyList();
        }
    }

    private String toJsonString(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(tags);
        } catch (JsonProcessingException e) {
            log.warn("标签序列化失败", e);
            return null;
        }
    }

    private List<String> parseTags(String tagsJson) {
        if (!StringUtils.hasText(tagsJson)) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(tagsJson, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            log.warn("标签反序列化失败: {}", tagsJson, e);
            return Collections.emptyList();
        }
    }

    private void updateTagUseCount(List<String> tags, boolean increment) {
        if (tags == null || tags.isEmpty()) {
            return;
        }
        for (String tagName : tags) {
            ContentTag tag = tagMapper.selectOne(
                    new LambdaQueryWrapper<ContentTag>().eq(ContentTag::getName, tagName));
            if (tag != null) {
                int newCount = increment ? tag.getUseCount() + 1 : Math.max(0, tag.getUseCount() - 1);
                tagMapper.update(null,
                        new LambdaUpdateWrapper<ContentTag>()
                                .eq(ContentTag::getId, tag.getId())
                                .set(ContentTag::getUseCount, newCount));
            }
        }
    }

    private void applyScheduleFields(Content entity, ContentDTO dto) {
        if (dto.getSeoTitle() != null) {
            entity.setSeoTitle(dto.getSeoTitle().isBlank() ? null : dto.getSeoTitle().trim());
        }
        if (dto.getSeoDescription() != null) {
            entity.setSeoDescription(dto.getSeoDescription().isBlank() ? null : dto.getSeoDescription().trim());
        }
        if (dto.getScheduledAt() != null) {
            String raw = dto.getScheduledAt().trim();
            entity.setScheduledAt(raw.isEmpty() ? null : parseScheduledAt(raw));
        }
    }

    private LocalDateTime parseScheduledAt(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        String text = raw.trim().replace('T', ' ');
        if (text.length() == 16) {
            text = text + ":00";
        }
        try {
            return LocalDateTime.parse(text, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        } catch (DateTimeParseException e1) {
            try {
                return LocalDateTime.parse(raw.trim());
            } catch (DateTimeParseException e2) {
                throw new BusinessException(ErrorCode.PARAM_ERROR, "定时发布时间格式不正确");
            }
        }
    }

    /** 扫描到期定时发布内容并发布 */
    @Transactional(rollbackFor = Exception.class)
    public int publishDueScheduledContents() {
        List<Content> due = this.lambdaQuery()
                .eq(Content::getStatus, "draft")
                .isNotNull(Content::getScheduledAt)
                .le(Content::getScheduledAt, LocalDateTime.now())
                .list();
        int count = 0;
        for (Content item : due) {
            item.setStatus("published");
            item.setPublishedAt(LocalDateTime.now());
            item.setScheduledAt(null);
            this.updateById(item);
            count++;
            log.info("定时发布内容 id={} title={}", item.getId(), item.getTitle());
        }
        return count;
    }
}
