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

    ContentTagDTO createTag(String name, String color, String tagKind, String platformCode);

    /**
     * 更新标签
     */
    ContentTagDTO updateTag(Long id, String name, String color);

    ContentTagDTO updateTag(Long id, String name, String color, String tagKind, String platformCode);

    /** 合并标签：将 source 名称迁移到 target，并删除 source */
    void mergeTags(Long targetId, Long sourceId);

    /**
     * 删除标签
     */
    void deleteTag(Long id);

    /**
     * 同步标签使用次数（根据内容表中的tags字段统计）
     */
    void syncTagUseCount();
}
