package com.miniprogram.service;

import com.miniprogram.dto.ContentAccessRuleDTO;
import com.miniprogram.entity.ContentAccessRule;

public interface ContentAccessRuleService {
    ContentAccessRule findByContentId(Long contentId);

    void saveForContent(Long contentId, ContentAccessRuleDTO dto);
}
