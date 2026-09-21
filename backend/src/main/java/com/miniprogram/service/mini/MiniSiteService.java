package com.miniprogram.service.mini;

import com.miniprogram.dto.mini.MiniContentReleaseVO;
import com.miniprogram.dto.mini.MiniPublishRequestDTO;
import com.miniprogram.dto.mini.MiniPublishResultVO;
import com.miniprogram.dto.mini.MiniRollbackResultVO;
import com.miniprogram.dto.mini.MiniSiteUpdateDTO;
import com.miniprogram.dto.mini.MiniSiteVO;
import com.miniprogram.dto.mini.PendingChangesVO;

import java.util.List;

/**
 * 小程序站点聚合（管理端唯一数据源）
 */
public interface MiniSiteService {

    /**
     * @param view live=已上线配置；draft=合并 site_builder_draft（默认）
     */
    MiniSiteVO getSite(String view);

    /** 写入 site_builder_draft，不改 live */
    MiniSiteVO updateSiteDraft(MiniSiteUpdateDTO dto);

    PendingChangesVO listPendingChanges();

    /** 提升草稿 + 发布脏页 + 递增 live_release_no；request 可勾选 pageIds / includeSite */
    MiniPublishResultVO publish(MiniPublishRequestDTO request);

    /** 内容发布时间线（第 N 次） */
    List<MiniContentReleaseVO> listContentReleases();

    /**
     * 回滚到指定内容发布：还原为待发布草稿，不直接改线上
     */
    MiniRollbackResultVO prepareRollback(Long releaseId);

    /**
     * 幂等：将 tpl-/名称含归档 的页面标为 archived；启动时可调用
     * @return 本次新归档条数
     */
    int migrateLegacyPages();
}
