package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.dto.ContentAccessRuleDTO;
import com.miniprogram.entity.ContentAccessRule;
import com.miniprogram.mapper.ContentAccessRuleMapper;
import com.miniprogram.service.ContentAccessRuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ContentAccessRuleServiceImpl implements ContentAccessRuleService {

    private final ContentAccessRuleMapper contentAccessRuleMapper;
    private final ObjectMapper objectMapper;

    @Override
    public ContentAccessRule findByContentId(Long contentId) {
        return contentAccessRuleMapper.selectOne(new LambdaQueryWrapper<ContentAccessRule>()
                .eq(ContentAccessRule::getContentId, contentId)
                .last("LIMIT 1"));
    }

    @Override
    public void saveForContent(Long contentId, ContentAccessRuleDTO dto) {
        if (contentId == null || dto == null) return;
        ContentAccessRule existing = findByContentId(contentId);
        try {
            String grantsJson = objectMapper.writeValueAsString(
                    dto.getGrants() != null ? dto.getGrants() : List.of("free"));
            if (existing == null) {
                ContentAccessRule row = new ContentAccessRule();
                row.setContentId(contentId);
                row.setGrantsJson(grantsJson);
                row.setPreviewMode(StringUtils.hasText(dto.getPreviewMode()) ? dto.getPreviewMode() : "percent");
                row.setPreviewValue(dto.getPreviewValue() != null ? dto.getPreviewValue() : 20);
                row.setPayProductId(dto.getPayProductId());
                row.setPlanetId(dto.getPlanetId());
                row.setCategoryDefault(0);
                row.setCreatedAt(LocalDateTime.now());
                row.setUpdatedAt(LocalDateTime.now());
                contentAccessRuleMapper.insert(row);
            } else {
                existing.setGrantsJson(grantsJson);
                if (StringUtils.hasText(dto.getPreviewMode())) {
                    existing.setPreviewMode(dto.getPreviewMode());
                }
                if (dto.getPreviewValue() != null) {
                    existing.setPreviewValue(dto.getPreviewValue());
                }
                existing.setPayProductId(dto.getPayProductId());
                existing.setPlanetId(dto.getPlanetId());
                existing.setUpdatedAt(LocalDateTime.now());
                contentAccessRuleMapper.updateById(existing);
            }
        } catch (Exception e) {
            throw new IllegalStateException("保存权限规则失败", e);
        }
    }
}
