package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.miniapp.CreateReleaseDTO;
import com.miniprogram.dto.miniapp.PublishPreflightVO;
import com.miniprogram.dto.miniapp.ReleaseQueryDTO;
import com.miniprogram.dto.miniapp.RollbackDTO;
import com.miniprogram.entity.MiniappRelease;

import java.util.List;
import java.util.Map;

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
     * 整包发布前检查：首页、导航绑定、空画布
     */
    PublishPreflightVO getPublishPreflight();

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

    /**
     * 整店模板列表（内容/版式快照，不含微信代码包）
     */
    List<MiniappRelease> listStoreTemplates();

    /**
     * 从当前正在搭建的内容新建一套命名模板
     */
    MiniappRelease createStoreTemplate(String templateName);

    /**
     * 复制一套模板
     */
    MiniappRelease duplicateStoreTemplate(Long id, String templateName);

    /**
     * 重命名模板
     */
    MiniappRelease renameStoreTemplate(Long id, String templateName);

    /**
     * 选用为正在搭建使用中（写入页面+外观，不上传微信代码）
     */
    MiniappRelease activateStoreTemplate(Long id);

    /**
     * 用当前正在搭建的内容覆盖该模板快照
     */
    MiniappRelease captureStoreTemplate(Long id);

    /**
     * 单页发布后写入当前线上快照，导航预览和小程序无需再走整包发布
     */
    void syncPublishedPageToLatestSnapshot(String path, String name, String dslContent);

    /**
     * 上线到小程序：提升品牌导航草稿 + 发布绑定页未上线草稿
     */
    Map<String, Object> publishContentToMiniapp();

    /**
     * 捕获当前已发布内容+系统配置快照（内容发布记录用）
     */
    String captureContentSnapshot();

    /**
     * 将快照还原为「待发布」草稿：页面写入未发布版本，站点写入 site_builder_draft；不改线上。
     * @return pagesRestored / siteDraftUpdated / message
     */
    Map<String, Object> restoreSnapshotAsPendingDraft(String snapshotJson);
}
