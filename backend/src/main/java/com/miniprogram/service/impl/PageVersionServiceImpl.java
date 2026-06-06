package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.PageVersionDTO;
import com.miniprogram.entity.Page;
import com.miniprogram.entity.PageVersion;
import com.miniprogram.mapper.PageVersionMapper;
import com.miniprogram.service.PageService;
import com.miniprogram.service.PageVersionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 页面版本 Service 实现
 */
@Slf4j
@Service
public class PageVersionServiceImpl extends BaseServiceImpl<PageVersionMapper, PageVersion> implements PageVersionService {

    @Lazy
    @Autowired
    private PageService pageService;

    @Override
    public PageResult<PageVersionDTO> listVersions(Long pageId, Long current, Long size) {
        LambdaQueryWrapper<PageVersion> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PageVersion::getPageId, pageId);
        wrapper.orderByDesc(PageVersion::getVersion);

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<PageVersion> page = this.page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(current, size), wrapper);

        PageResult<PageVersionDTO> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setCurrent(page.getCurrent());
        result.setSize(page.getSize());
        result.setRecords(page.getRecords().stream().map(this::toDTO).toList());
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PageVersionDTO rollbackVersion(Long pageId, Integer version) {
        // 确认页面存在
        Page page = pageService.getById(pageId);
        if (page == null) {
            throw new BusinessException(300401, "页面不存在");
        }

        // 查找目标版本
        PageVersion targetVersion = this.lambdaQuery()
                .eq(PageVersion::getPageId, pageId)
                .eq(PageVersion::getVersion, version)
                .one();

        if (targetVersion == null) {
            throw new BusinessException(300402, "目标版本不存在: v" + version);
        }

        // 基于目标版本的 DSL 创建新版本（回滚版本）
        Integer latestVersion = getLatestVersion(pageId);
        int newVersionNum = latestVersion + 1;

        PageVersion newVersion = new PageVersion();
        newVersion.setPageId(pageId);
        newVersion.setVersion(newVersionNum);
        newVersion.setDslContent(targetVersion.getDslContent());
        newVersion.setStatus(0); // 草稿
        this.save(newVersion);

        // 将目标版本标记为已回滚
        targetVersion.setStatus(2);
        this.updateById(targetVersion);

        // 更新页面的当前版本号
        page.setCurrentVersion(newVersionNum);
        page.setStatus(0); // 回滚后变为草稿状态
        pageService.updateById(page);

        return toDTO(newVersion);
    }

    @Override
    public Integer getLatestVersion(Long pageId) {
        PageVersion latest = this.lambdaQuery()
                .eq(PageVersion::getPageId, pageId)
                .orderByDesc(PageVersion::getVersion)
                .last("LIMIT 1")
                .one();
        return latest != null ? latest.getVersion() : 0;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PageVersionDTO saveDraftVersion(Long pageId, String dslContent) {
        Integer latestVersion = getLatestVersion(pageId);
        int newVersionNum = latestVersion + 1;

        PageVersion version = new PageVersion();
        version.setPageId(pageId);
        version.setVersion(newVersionNum);
        version.setDslContent(dslContent);
        version.setStatus(0); // 草稿
        this.save(version);

        return toDTO(version);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void publishVersion(Long versionId, Long publisherId) {
        PageVersion version = this.getById(versionId);
        if (version == null) {
            throw new BusinessException(300402, "页面版本不存在");
        }

        this.lambdaUpdate()
                .eq(PageVersion::getPageId, version.getPageId())
                .eq(PageVersion::getStatus, 1)
                .ne(PageVersion::getId, version.getId())
                .set(PageVersion::getStatus, 2)
                .update();

        version.setStatus(1); // 已发布
        version.setPublishedAt(LocalDateTime.now());
        version.setPublisherId(publisherId);
        this.updateById(version);
    }

    @Override
    public String getVersionDsl(Long pageId, Integer version) {
        PageVersion pv = this.lambdaQuery()
                .eq(PageVersion::getPageId, pageId)
                .eq(PageVersion::getVersion, version)
                .one();
        return pv != null ? pv.getDslContent() : null;
    }

    // ==================== 私有方法 ====================

    private PageVersionDTO toDTO(PageVersion version) {
        PageVersionDTO dto = new PageVersionDTO();
        BeanUtils.copyProperties(version, dto);
        dto.setStatusDesc(PageVersionDTO.getStatusDesc(version.getStatus()));
        return dto;
    }
}
