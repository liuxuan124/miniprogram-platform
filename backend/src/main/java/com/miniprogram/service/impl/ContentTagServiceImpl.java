package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.dto.ContentTagDTO;
import com.miniprogram.entity.Content;
import com.miniprogram.entity.ContentTag;
import com.miniprogram.mapper.ContentMapper;
import com.miniprogram.mapper.ContentTagMapper;
import com.miniprogram.service.ContentTagService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 内容标签 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContentTagServiceImpl extends BaseServiceImpl<ContentTagMapper, ContentTag>
        implements ContentTagService {

    private final ContentMapper contentMapper;
    private final ObjectMapper objectMapper;

    @Override
    public List<ContentTagDTO> listTags(String keyword) {
        var query = this.lambdaQuery()
                .like(StringUtils.hasText(keyword), ContentTag::getName, keyword)
                .orderByDesc(ContentTag::getUseCount);
        List<ContentTag> tags = query.list();

        return tags.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public ContentTagDTO createTag(String name, String color) {
        ContentTag tag = new ContentTag();
        tag.setName(name);
        tag.setColor(color);
        tag.setUseCount(0);
        this.save(tag);
        return toDTO(tag);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ContentTagDTO updateTag(Long id, String name, String color) {
        ContentTag tag = this.getById(id);
        if (tag == null) {
            throw new com.miniprogram.common.BusinessException(4001, "标签不存在");
        }
        if (StringUtils.hasText(name)) {
            tag.setName(name);
        }
        tag.setColor(color);
        this.updateById(tag);
        return toDTO(tag);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteTag(Long id) {
        ContentTag tag = this.getById(id);
        if (tag == null) {
            throw new com.miniprogram.common.BusinessException(4001, "标签不存在");
        }
        this.removeById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void syncTagUseCount() {
        // 统计所有已发布内容中的标签使用情况
        List<Content> contents = contentMapper.selectList(
                new LambdaQueryWrapper<Content>().isNotNull(Content::getTags));

        Map<String, Integer> tagCountMap = new HashMap<>();
        for (Content content : contents) {
            List<String> tags = parseTags(content.getTags());
            for (String tagName : tags) {
                tagCountMap.merge(tagName, 1, Integer::sum);
            }
        }

        // 更新已有标签的计数
        List<ContentTag> existingTags = this.list();
        for (ContentTag tag : existingTags) {
            Integer count = tagCountMap.getOrDefault(tag.getName(), 0);
            tag.setUseCount(count);
            this.updateById(tag);
            tagCountMap.remove(tag.getName());
        }

        // 创建新标签
        for (Map.Entry<String, Integer> entry : tagCountMap.entrySet()) {
            ContentTag newTag = new ContentTag();
            newTag.setName(entry.getKey());
            newTag.setUseCount(entry.getValue());
            this.save(newTag);
        }

        // 删除计数为0的标签
        this.remove(new LambdaQueryWrapper<ContentTag>().eq(ContentTag::getUseCount, 0));
    }

    // ==================== 私有方法 ====================

    private ContentTagDTO toDTO(ContentTag entity) {
        ContentTagDTO dto = new ContentTagDTO();
        BeanUtils.copyProperties(entity, dto);
        return dto;
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
}
