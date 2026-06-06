package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.*;
import java.util.HashSet;
import java.util.Set;
import com.miniprogram.entity.Page;
import com.miniprogram.entity.PageVersion;
import com.miniprogram.mapper.PageMapper;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.PageService;
import com.miniprogram.service.PageVersionService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * 页面 Service 实现
 */
@Slf4j
@Service
public class PageServiceImpl extends BaseServiceImpl<PageMapper, Page> implements PageService {

    @Lazy
    @Autowired
    private PageVersionService pageVersionService;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String DSL_SCHEMA_VERSION = "1.0";

    @Override
    public PageResult<PageDetailDTO> listPages(PageQueryDTO queryDTO) {
        LambdaQueryWrapper<Page> wrapper = new LambdaQueryWrapper<>();
        wrapper.like(StringUtils.hasText(queryDTO.getKeyword()), Page::getName, queryDTO.getKeyword());
        wrapper.eq(queryDTO.getType() != null, Page::getType, queryDTO.getType());
        wrapper.eq(queryDTO.getStatus() != null, Page::getStatus, queryDTO.getStatus());
        wrapper.orderByDesc(Page::getUpdateTime);

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<Page> page = this.page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(queryDTO.getCurrent(), queryDTO.getSize()), wrapper);

        PageResult<PageDetailDTO> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setCurrent(page.getCurrent());
        result.setSize(page.getSize());
        result.setRecords(page.getRecords().stream().map(this::toDetailDTO).toList());
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PageDetailDTO createPage(PageCreateDTO createDTO) {
        // 检查路径唯一性
        checkPathUnique(createDTO.getPath(), null);

        Page page = new Page();
        BeanUtils.copyProperties(createDTO, page);
        page.setStatus(0); // 草稿
        page.setCurrentVersion(0);
        this.save(page);

        return toDetailDTO(page);
    }

    @Override
    public PageDetailDTO getPageDetail(Long id) {
        Page page = getExistingPage(id);
        PageDetailDTO dto = toDetailDTO(page);

        // 获取当前版本的 DSL 内容
        if (page.getCurrentVersion() != null && page.getCurrentVersion() > 0) {
            String dsl = pageVersionService.getVersionDsl(id, page.getCurrentVersion());
            dto.setDraftDslContent(dsl);
        }

        return dto;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PageDetailDTO updatePage(Long id, PageUpdateDTO updateDTO) {
        Page page = getExistingPage(id);

        // 如果更新了路径，检查唯一性
        if (StringUtils.hasText(updateDTO.getPath()) && !updateDTO.getPath().equals(page.getPath())) {
            checkPathUnique(updateDTO.getPath(), id);
        }

        if (StringUtils.hasText(updateDTO.getName())) {
            page.setName(updateDTO.getName());
        }
        if (updateDTO.getType() != null) {
            page.setType(updateDTO.getType());
        }
        if (StringUtils.hasText(updateDTO.getPath())) {
            page.setPath(updateDTO.getPath());
        }
        if (updateDTO.getShareTitle() != null) {
            page.setShareTitle(updateDTO.getShareTitle());
        }
        if (updateDTO.getShareImage() != null) {
            page.setShareImage(updateDTO.getShareImage());
        }
        if (updateDTO.getDescription() != null) {
            page.setDescription(updateDTO.getDescription());
        }

        this.updateById(page);
        return toDetailDTO(page);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deletePage(Long id) {
        Page page = getExistingPage(id);

        // 已发布的页面不可删除
        if (page.getStatus() == 1) {
            throw new BusinessException(300201, "页面已发布，不可删除");
        }

        // 逻辑删除
        this.removeById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PageVersionDTO saveDraft(Long id, PageDraftDTO draftDTO) {
        Page page = getExistingPage(id);

        // 并发冲突检测：客户端传入 expectedVersion 时校验
        if (draftDTO.getExpectedVersion() != null) {
            int dbVersion = page.getCurrentVersion() == null ? 0 : page.getCurrentVersion();
            if (dbVersion != draftDTO.getExpectedVersion()) {
                throw new BusinessException(300409,
                    "页面已被其他人修改（服务器版本 v" + dbVersion + "，您的版本 v" + draftDTO.getExpectedVersion() + "），请刷新后重试");
            }
        }

        // 校验 DSL schema_version
        validateDsl(draftDTO.getDslContent());

        // 保存草稿版本
        PageVersionDTO versionDTO = pageVersionService.saveDraftVersion(id, draftDTO.getDslContent());

        // 更新页面的当前版本号和状态
        page.setCurrentVersion(versionDTO.getVersion());
        // 如果之前是已下架状态，改为草稿状态
        if (page.getStatus() == 2) {
            page.setStatus(0);
        }
        this.updateById(page);

        return versionDTO;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PageDetailDTO publishPage(Long id) {
        Page page = getExistingPage(id);

        if (page.getCurrentVersion() == null || page.getCurrentVersion() == 0) {
            throw new BusinessException(300201, "页面没有可发布的版本，请先保存草稿");
        }

        // 发布当前版本
        PageVersion latestVersion = pageVersionService.lambdaQuery()
                .eq(PageVersion::getPageId, id)
                .eq(PageVersion::getVersion, page.getCurrentVersion())
                .one();

        if (latestVersion == null) {
            throw new BusinessException(300401, "页面版本不存在");
        }

        Long currentUserId = SecurityUtils.getCurrentUserId();
        pageVersionService.publishVersion(latestVersion.getId(), currentUserId);

        // 更新页面状态为已发布
        page.setStatus(1);
        this.updateById(page);

        return toDetailDTO(page);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PageDetailDTO unpublishPage(Long id) {
        Page page = getExistingPage(id);

        if (page.getStatus() != 1) {
            throw new BusinessException(300201, "页面未发布，无法下架");
        }

        page.setStatus(2); // 已下架
        this.updateById(page);

        return toDetailDTO(page);
    }

    @Override
    public String getPublishedPageDsl(String path) {
        Page page = findPublishedPageByPath(path);

        if (page == null) {
            return null;
        }

        PageVersion publishedVersion = pageVersionService.lambdaQuery()
                .eq(PageVersion::getPageId, page.getId())
                .eq(PageVersion::getStatus, 1)
                .orderByDesc(PageVersion::getVersion)
                .last("LIMIT 1")
                .one();

        return publishedVersion != null ? publishedVersion.getDslContent() : null;
    }

    private Page findPublishedPageByPath(String path) {
        String normalized = normalizePagePath(path);
        Page page = this.lambdaQuery()
                .eq(Page::getPath, normalized)
                .eq(Page::getStatus, 1) // 已发布
                .one();
        if (page != null) {
            return page;
        }

        String alternate = normalized.startsWith("/") ? normalized.substring(1) : "/" + normalized;
        if (alternate.equals(normalized)) {
            return null;
        }

        return this.lambdaQuery()
                .eq(Page::getPath, alternate)
                .eq(Page::getStatus, 1)
                .one();
    }

    private String normalizePagePath(String path) {
        if (!StringUtils.hasText(path)) {
            return "";
        }
        return path.trim();
    }

    // ==================== 私有方法 ====================

    private Page getExistingPage(Long id) {
        Page page = this.getById(id);
        if (page == null) {
            throw new BusinessException(300401, "页面不存在");
        }
        return page;
    }

    private void checkPathUnique(String path, Long excludeId) {
        LambdaQueryWrapper<Page> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Page::getPath, path);
        wrapper.ne(excludeId != null, Page::getId, excludeId);
        long count = this.count(wrapper);
        if (count > 0) {
            throw new BusinessException(300203, "页面路径已存在: " + path);
        }
    }

    private void validateDsl(String dslContent) {
        try {
            JsonNode node = objectMapper.readTree(dslContent);

            // 1. schema_version
            JsonNode schemaVersion = node.get("schema_version");
            if (schemaVersion == null || !DSL_SCHEMA_VERSION.equals(schemaVersion.asText())) {
                throw new BusinessException(300202, "DSL schema_version 必须为 " + DSL_SCHEMA_VERSION);
            }

            // 2. page 对象
            JsonNode pageNode = node.get("page");
            if (pageNode == null || !pageNode.isObject()) {
                throw new BusinessException(300202, "DSL 必须包含 page 对象");
            }
            if (!pageNode.has("id") || !StringUtils.hasText(pageNode.get("id").asText())) {
                throw new BusinessException(300202, "DSL page.id 不能为空");
            }
            if (!pageNode.has("name") || !StringUtils.hasText(pageNode.get("name").asText())) {
                throw new BusinessException(300202, "DSL page.name 不能为空");
            }

            // 3. components 数组
            JsonNode components = node.get("components");
            if (components == null || !components.isArray()) {
                throw new BusinessException(300202, "DSL 必须包含 components 数组");
            }

            // 4. 每个组件：id 非空且唯一、type 非空
            Set<String> idSet = new HashSet<>();
            for (int i = 0; i < components.size(); i++) {
                JsonNode comp = components.get(i);
                String id = comp.has("id") ? comp.get("id").asText("") : "";
                String type = comp.has("type") ? comp.get("type").asText("") : "";
                if (!StringUtils.hasText(id)) {
                    throw new BusinessException(300202, "第 " + (i + 1) + " 个组件缺少 id 字段");
                }
                if (!StringUtils.hasText(type)) {
                    throw new BusinessException(300202, "第 " + (i + 1) + " 个组件缺少 type 字段");
                }
                if (!idSet.add(id)) {
                    throw new BusinessException(300202, "组件 ID 重复: " + id);
                }
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(300202, "DSL 内容格式错误，必须为有效 JSON");
        }
    }

    private PageDetailDTO toDetailDTO(Page page) {
        PageDetailDTO dto = new PageDetailDTO();
        BeanUtils.copyProperties(page, dto);
        dto.setTypeDesc(PageDetailDTO.getTypeDesc(page.getType()));
        dto.setStatusDesc(PageDetailDTO.getStatusDesc(page.getStatus()));
        return dto;
    }
}
