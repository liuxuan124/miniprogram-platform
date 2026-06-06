package com.miniprogram.service;

import com.miniprogram.dto.ContentTagDTO;
import com.miniprogram.entity.ContentTag;

import java.util.List;

/**
 * 内容标签 Service
 */
public interface ContentTagService extends BaseService<ContentTag> {

    /**
     * 获取标签列表
     */
    List<ContentTagDTO> listTags(String keyword);

    /**
     * 创建标签
     */
    ContentTagDTO createTag(String name, String color);

    /**
     * 更新标签
     */
    ContentTagDTO updateTag(Long id, String name, String color);

    /**
     * 删除标签
     */
    void deleteTag(Long id);

    /**
     * 同步标签使用次数（根据内容表中的tags字段统计）
     */
    void syncTagUseCount();
}
