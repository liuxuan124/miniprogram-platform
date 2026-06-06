package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.ContentDTO;
import com.miniprogram.dto.ContentDetailDTO;
import com.miniprogram.dto.ContentQueryDTO;
import com.miniprogram.entity.Content;
import com.miniprogram.entity.ContentTag;
import com.miniprogram.mapper.ContentMapper;
import com.miniprogram.mapper.ContentTagMapper;
import com.miniprogram.service.ContentCategoryService;
import com.miniprogram.service.ContentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
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

    @Override
    public PageResult<ContentDetailDTO> listContents(ContentQueryDTO queryDTO) {
        LambdaQueryWrapper<Content> wrapper = buildQueryWrapper(queryDTO);
        wrapper.orderByAsc(Content::getSortOrder);
        wrapper.orderByDesc(Content::getUpdateTime);

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
        entity.setStatus("draft");
        entity.setViewCount(0);
        entity.setLikeCount(0);
        if (entity.getSortOrder() == null) {
            entity.setSortOrder(0);
        }
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
        if (dto.getCategoryId() != null) {
            entity.setCategoryId(dto.getCategoryId());
        }
        if (dto.getCoverImage() != null) {
            entity.setCoverImage(dto.getCoverImage());
        }
        if (dto.getSummary() != null) {
            entity.setSummary(dto.getSummary());
        }
        if (dto.getContent() != null) {
            entity.setContent(dto.getContent());
        }
        if (dto.getAuthor() != null) {
            entity.setAuthor(dto.getAuthor());
        }
        if (dto.getSource() != null) {
            entity.setSource(dto.getSource());
        }
        if (dto.getTags() != null) {
            entity.setTags(toJsonString(dto.getTags()));
        }
        if (dto.getSortOrder() != null) {
            entity.setSortOrder(dto.getSortOrder());
        }
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

        entity.setStatus("draft");
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
        mpQuery.setStatus("published");

        LambdaQueryWrapper<Content> wrapper = buildQueryWrapper(mpQuery);
        wrapper.orderByAsc(Content::getSortOrder);
        wrapper.orderByDesc(Content::getPublishedAt);

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<Content> page =
                this.page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(
                        mpQuery.getCurrent(), mpQuery.getSize()), wrapper);

        List<ContentDetailDTO> records = page.getRecords().stream()
                .map(this::toDetailDTO)
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

        return toDetailDTO(entity);
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
        dto.setCategoryName(categoryService.getCategoryName(entity.getCategoryId()));
        return dto;
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
}
