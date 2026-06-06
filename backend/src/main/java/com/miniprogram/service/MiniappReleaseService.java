package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.miniapp.CreateReleaseDTO;
import com.miniprogram.dto.miniapp.ReleaseQueryDTO;
import com.miniprogram.dto.miniapp.RollbackDTO;
import com.miniprogram.entity.MiniappRelease;

import java.util.List;

/**
 * 小程序版本发布 Service
 */
public interface MiniappReleaseService extends BaseService<MiniappRelease> {

    /**
     * 分页查询版本发布列表
     */
    PageResult<MiniappRelease> listReleases(ReleaseQueryDTO query);

    /**
     * 获取版本发布详情（含快照）
     */
    MiniappRelease getReleaseDetail(Long id);

    /**
     * 获取最新已发布版本
     */
    MiniappRelease getLatestRelease();

    /**
     * 创建版本发布（快照所有已发布页面+系统配置）
     */
    MiniappRelease createRelease(CreateReleaseDTO dto);

    /**
     * 发布版本（将草稿状态改为已发布）
     */
    MiniappRelease publishRelease(Long id);

    /**
     * 回滚到指定版本
     */
    MiniappRelease rollbackRelease(RollbackDTO dto);

    /**
     * 获取版本历史（用于版本选择器）
     */
    List<MiniappRelease> getReleaseHistory();

    /**
     * 自动生成下一个语义化版本号
     */
    String generateNextSemver(String changeType);

    /**
     * 将模板提升为已发布版本
     */
    MiniappRelease promoteRelease(Long templateId);

    /**
     * 删除模板（仅允许删除草稿状态的模板）
     */
    void deleteRelease(Long id);
}
