package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.miniapp.CreateReleaseDTO;
import com.miniprogram.dto.miniapp.PublishPreflightVO;
import com.miniprogram.dto.miniapp.ReleaseQueryDTO;
import com.miniprogram.dto.miniapp.RollbackDTO;
import com.miniprogram.entity.MiniappRelease;
import com.miniprogram.entity.Page;
import com.miniprogram.entity.PageVersion;
import com.miniprogram.entity.SystemConfig;
import com.miniprogram.mapper.MiniappReleaseMapper;
import com.miniprogram.mapper.PageMapper;
import com.miniprogram.mapper.PageVersionMapper;
import com.miniprogram.mapper.SystemConfigMapper;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.MiniappReleaseService;
import com.miniprogram.service.VersionOperationLogService;
import com.miniprogram.service.miniapp.StoreTemplateNames;
import com.miniprogram.service.miniapp.WarmStoreTemplateSeeder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.*;
import java.util.Locale;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MiniappReleaseServiceImpl extends BaseServiceImpl<MiniappReleaseMapper, MiniappRelease> implements MiniappReleaseService {

    private static final Set<String> SUPPORTED_COMPONENT_TYPES = Set.of(
            "search", "notice_bar", "category_nav", "banner", "image", "nav", "product_list",
            "flash_sale", "article_list", "article_feed", "note_feed", "moments_feed", "hot_news",
            "activity_entry", "activity_list",
            "appointment_service", "member_card", "coupon", "ai_entry", "video",
            "brand_intro", "brand_header", "image_text", "contact_info", "certificate", "countdown",
            "float_button", "rich_text", "section_title", "divider", "spacer", "form_entry", "join_group",
            "container", "image_hotspot", "section_bg", "feature_cards", "image_cube", "content_tabs",
            "planet_hero", "planet_topics", "planet_feed",
            "warm_greet", "warm_authors", "warm_feature", "warm_columns", "warm_planet_rec", "warm_feed",
            "warm_home", "warm_discover", "warm_planet", "warm_shop", "warm_mine"
    );

    private final PageMapper pageMapper;
    private final PageVersionMapper pageVersionMapper;
    private final SystemConfigMapper systemConfigMapper;
    private final VersionOperationLogService versionOperationLogService;
    private final ObjectMapper objectMapper;
    private final WarmStoreTemplateSeeder warmStoreTemplateSeeder;

    @Override
    public PageResult<MiniappRelease> listReleases(ReleaseQueryDTO query) {
        LambdaQueryWrapper<MiniappRelease> wrapper = new LambdaQueryWrapper<>();
        wrapper.like(StringUtils.hasText(query.getKeyword()), MiniappRelease::getSemver, query.getKeyword())
                .or()
                .like(StringUtils.hasText(query.getKeyword()), MiniappRelease::getReleaseNotes, query.getKeyword());
        wrapper.eq(query.getStatus() != null, MiniappRelease::getStatus, query.getStatus());
        wrapper.eq(StringUtils.hasText(query.getChangeType()), MiniappRelease::getChangeType, query.getChangeType());
        wrapper.orderByDesc(MiniappRelease::getMajor)
                .orderByDesc(MiniappRelease::getMinor)
                .orderByDesc(MiniappRelease::getPatch);

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<MiniappRelease> page =
                this.page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(query.getCurrent(), query.getSize()), wrapper);

        return PageResult.of(page);
    }

    @Override
    public MiniappRelease getReleaseDetail(Long id) {
        MiniappRelease release = this.getById(id);
        BusinessException.throwIf(release == null, ErrorCode.RELEASE_NOT_FOUND);
        // 预览/详情不回传私钥等敏感字段，减小体积并避免误泄露到浏览器
        release.setSnapshot(sanitizeSnapshotForClient(release.getSnapshot()));
        release.setBackupSnapshot(null);
        return release;
    }

    @Override
    public MiniappRelease getLatestRelease() {
        return this.lambdaQuery()
                .eq(MiniappRelease::getStatus, 1)
                .orderByDesc(MiniappRelease::getMajor)
                .orderByDesc(MiniappRelease::getMinor)
                .orderByDesc(MiniappRelease::getPatch)
                .last("LIMIT 1")
                .one();
    }

    @Override
    public PublishPreflightVO getPublishPreflight() {
        PublishPreflightVO vo = buildPreflight();
        MiniappRelease latest = getLatestRelease();
        if (latest != null) {
            vo.setLatestSemver(latest.getSemver());
        }
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MiniappRelease createRelease(CreateReleaseDTO dto) {
        long startTime = System.currentTimeMillis();
        String semver;
        String mode = dto.getMode();
        try {
            if (StringUtils.hasText(dto.getCustomSemver())) {
                semver = dto.getCustomSemver();
                long count = this.lambdaQuery()
                        .eq(MiniappRelease::getSemver, semver)
                        .count();
                BusinessException.throwIf(count > 0, ErrorCode.RELEASE_SEMVER_DUPLICATE);
            } else {
                if ("publish".equals(mode)) {
                    semver = generateNextSemver("minor");
                } else {
                    semver = generateNextSemver("patch");
                }
            }

            String[] parts = semver.split("\\.");
            int major = Integer.parseInt(parts[0]);
            int minor = Integer.parseInt(parts[1]);
            int patch = Integer.parseInt(parts[2]);

            String snapshot = buildSnapshot();
            validateSnapshotForRelease(snapshot);

            if ("publish".equals(mode)) {
                publishBoundPagesOrThrow();
                // 页面发布后快照可能变化，重建再校验一次
                snapshot = buildSnapshot();
                validateSnapshotForRelease(snapshot);
            }

            MiniappRelease release = new MiniappRelease();
            release.setSemver(semver);
            release.setMajor(major);
            release.setMinor(minor);
            release.setPatch(patch);
            release.setChangeType(dto.getChangeType());
            release.setReleaseNotes(dto.getReleaseNotes());
            release.setSnapshot(snapshot);
            release.setMode(mode);
            if (!"publish".equals(mode)) {
                String templateName = StoreTemplateNames.normalize(dto.getTemplateName());
                if (templateName.isEmpty()) {
                    templateName = uniqueTemplateName(
                            StoreTemplateNames.display(null, semver, dto.getReleaseNotes()), null);
                } else {
                    assertTemplateNameUnique(templateName, null);
                }
                release.setTemplateName(templateName);
                boolean hasCurrent = this.lambdaQuery()
                        .eq(MiniappRelease::getIsCurrent, 1)
                        .count() > 0;
                release.setIsCurrent(hasCurrent ? 0 : 1);
            } else {
                release.setIsCurrent(0);
            }

            long pageCount = pageMapper.selectCount(new LambdaQueryWrapper<Page>()
                    .eq(Page::getStatus, 1));
            release.setPageCount((int) pageCount);

            if ("publish".equals(mode)) {
                MiniappRelease currentPublished = this.lambdaQuery()
                        .eq(MiniappRelease::getStatus, 1)
                        .one();
                if (currentPublished != null) {
                    currentPublished.setStatus(2);
                    this.updateById(currentPublished);
                }
                release.setStatus(1);
                Long currentUserId = SecurityUtils.getCurrentUserId();
                release.setPublishedAt(LocalDateTime.now());
                release.setPublisherId(currentUserId);
                release.setPublisherName(getCurrentUsername());
                applySystemConfigFromSnapshot(snapshot);

                this.save(release);

                long duration = System.currentTimeMillis() - startTime;
                versionOperationLogService.logOperation(release.getId(), semver, "publish",
                        "直接发布版本: " + semver, true, null, duration);
            } else {
                release.setStatus(0);
                this.save(release);

                long duration = System.currentTimeMillis() - startTime;
                versionOperationLogService.logOperation(release.getId(), semver, "create",
                        "创建模板版本: " + semver, true, null, duration);
            }

            return release;
        } catch (BusinessException e) {
            long duration = System.currentTimeMillis() - startTime;
            versionOperationLogService.logOperation(null, null, "create",
                    "创建版本发布失败", false, e.getMessage(), duration);
            throw e;
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            versionOperationLogService.logOperation(null, null, "create",
                    "创建版本发布失败", false, e.getMessage(), duration);
            throw new BusinessException(ErrorCode.DATA_SAVE_FAILED, "创建版本发布失败: " + e.getMessage());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MiniappRelease promoteRelease(Long templateId) {
        long startTime = System.currentTimeMillis();

        MiniappRelease target = this.getById(templateId);
        BusinessException.throwIf(target == null, ErrorCode.RELEASE_NOT_FOUND);
        BusinessException.throwIf(target.getStatus() != 0, ErrorCode.RELEASE_PROMOTE_FAILED.getCode(),
                "只能提升草稿/模板状态的版本，当前状态: " + target.getStatus());

        try {
            MiniappRelease currentPublished = this.lambdaQuery()
                    .eq(MiniappRelease::getStatus, 1)
                    .one();
            if (currentPublished != null) {
                currentPublished.setStatus(2);
                this.updateById(currentPublished);
            }

            Long currentUserId = SecurityUtils.getCurrentUserId();
            target.setStatus(1);
            target.setPublishedAt(LocalDateTime.now());
            target.setPublisherId(currentUserId);
            target.setPublisherName(getCurrentUsername());
            target.setMode("publish");
            this.updateById(target);

            applySystemConfigFromSnapshot(target.getSnapshot());

            long duration = System.currentTimeMillis() - startTime;
            versionOperationLogService.logOperation(target.getId(), target.getSemver(), "promote",
                    "提升模板为已发布版本: " + target.getSemver(), true, null, duration);

            return target;
        } catch (BusinessException e) {
            long duration = System.currentTimeMillis() - startTime;
            versionOperationLogService.logOperation(templateId, null, "promote",
                    "提升模板失败", false, e.getMessage(), duration);
            throw e;
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            versionOperationLogService.logOperation(templateId, null, "promote",
                    "提升模板失败", false, e.getMessage(), duration);
            throw new BusinessException(ErrorCode.RELEASE_PROMOTE_FAILED, "提升模板为已发布版本失败: " + e.getMessage());
        }
    }

    @Override
    public void deleteRelease(Long id) {
        MiniappRelease release = this.getById(id);
        BusinessException.throwIf(release == null, ErrorCode.RELEASE_NOT_FOUND);
        BusinessException.throwIf(Integer.valueOf(1).equals(release.getIsSystem()),
                ErrorCode.STORE_TEMPLATE_SYSTEM_FORBIDDEN);
        BusinessException.throwIf(release.getStatus() == 1, ErrorCode.RELEASE_DELETE_FORBIDDEN.getCode(),
                "当前线上版本不可删除，请先发布其他版本再删除此版本");
        BusinessException.throwIf(Integer.valueOf(1).equals(release.getIsCurrent()),
                ErrorCode.STORE_TEMPLATE_IN_USE);

        this.lambdaUpdate()
                .eq(MiniappRelease::getId, id)
                .set(MiniappRelease::getDeleted, 1)
                .update();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MiniappRelease publishRelease(Long id) {
        long startTime = System.currentTimeMillis();
        MiniappRelease release = this.getById(id);
        BusinessException.throwIf(release == null, ErrorCode.RELEASE_NOT_FOUND);
        BusinessException.throwIf(release.getStatus() == 1, ErrorCode.RELEASE_ALREADY_PUBLISHED);
        BusinessException.throwIf(release.getStatus() == 2, ErrorCode.RELEASE_NOT_PUBLISHED);
        validateSnapshotForRelease(release.getSnapshot());

        try {
            MiniappRelease currentPublished = this.lambdaQuery()
                    .eq(MiniappRelease::getStatus, 1)
                    .one();
            if (currentPublished != null && !Objects.equals(currentPublished.getId(), release.getId())) {
                currentPublished.setStatus(2);
                this.updateById(currentPublished);
            }

            Long currentUserId = SecurityUtils.getCurrentUserId();
            release.setStatus(1);
            release.setPublishedAt(LocalDateTime.now());
            release.setPublisherId(currentUserId);
            release.setPublisherName(getCurrentUsername());
            this.updateById(release);
            applySystemConfigFromSnapshot(release.getSnapshot());

            long duration = System.currentTimeMillis() - startTime;
            versionOperationLogService.logOperation(release.getId(), release.getSemver(), "publish",
                    "发布版本: " + release.getSemver(), true, null, duration);

            return release;
        } catch (BusinessException e) {
            long duration = System.currentTimeMillis() - startTime;
            versionOperationLogService.logOperation(id, release.getSemver(), "publish",
                    "发布版本失败", false, e.getMessage(), duration);
            throw e;
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            versionOperationLogService.logOperation(id, release.getSemver(), "publish",
                    "发布版本失败", false, e.getMessage(), duration);
            throw new BusinessException(ErrorCode.DATA_UPDATE_FAILED, "发布版本失败: " + e.getMessage());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MiniappRelease rollbackRelease(RollbackDTO dto) {
        long startTime = System.currentTimeMillis();

        MiniappRelease targetRelease = this.lambdaQuery()
                .eq(MiniappRelease::getSemver, dto.getTargetSemver())
                .last("LIMIT 1")
                .one();
        if (targetRelease == null) {
            throw new BusinessException(ErrorCode.RELEASE_NOT_PUBLISHED,
                    "目标版本不存在或未发布: " + dto.getTargetSemver());
        }

        try {
            String backupSnapshot = buildSnapshot();

            String snapshotJson = targetRelease.getSnapshot();
            if (!StringUtils.hasText(snapshotJson)) {
                throw new BusinessException(ErrorCode.RELEASE_ROLLBACK_FAILED,
                        "目标版本快照为空，无法回滚");
            }

            String extraNote = restoreSnapshotContent(snapshotJson, Boolean.TRUE.equals(dto.getOfflineExtraPages()));

            MiniappRelease currentPublished = getLatestRelease();
            if (currentPublished != null) {
                currentPublished.setStatus(2);
                currentPublished.setRolledBackAt(LocalDateTime.now());
                currentPublished.setRolledBackBy(SecurityUtils.getCurrentUserId());
                currentPublished.setRolledBackFrom(dto.getTargetSemver());
                this.updateById(currentPublished);
            }

            // semver 列仅 varchar(20)，不能拼长后缀；用下一个 patch 号作为回滚产物版本
            String rollbackSemver = generateNextSemver("patch");
            String[] parts = rollbackSemver.split("\\.");
            MiniappRelease rollbackRelease = new MiniappRelease();
            rollbackRelease.setSemver(rollbackSemver);
            rollbackRelease.setMajor(Integer.parseInt(parts[0]));
            rollbackRelease.setMinor(Integer.parseInt(parts[1]));
            rollbackRelease.setPatch(Integer.parseInt(parts[2]));
            rollbackRelease.setChangeType("patch");
            rollbackRelease.setReleaseNotes("回滚至版本 " + dto.getTargetSemver()
                    + (StringUtils.hasText(dto.getReason()) ? "，原因: " + dto.getReason() : "")
                    + extraNote);
            rollbackRelease.setSnapshot(targetRelease.getSnapshot());
            rollbackRelease.setBackupSnapshot(backupSnapshot);
            rollbackRelease.setPageCount(targetRelease.getPageCount());
            rollbackRelease.setStatus(1);
            rollbackRelease.setPublishedAt(LocalDateTime.now());
            rollbackRelease.setPublisherId(SecurityUtils.getCurrentUserId());
            rollbackRelease.setPublisherName(getCurrentUsername());
            rollbackRelease.setRolledBackFrom(dto.getTargetSemver());
            this.save(rollbackRelease);

            long duration = System.currentTimeMillis() - startTime;
            versionOperationLogService.logOperation(rollbackRelease.getId(), targetRelease.getSemver(), "rollback",
                    "回滚至版本: " + dto.getTargetSemver(), true, null, duration);

            return rollbackRelease;
        } catch (BusinessException e) {
            long duration = System.currentTimeMillis() - startTime;
            versionOperationLogService.logOperation(targetRelease.getId(), dto.getTargetSemver(), "rollback",
                    "回滚版本失败", false, e.getMessage(), duration);
            throw e;
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            versionOperationLogService.logOperation(targetRelease.getId(), dto.getTargetSemver(), "rollback",
                    "回滚版本失败", false, e.getMessage(), duration);
            throw new BusinessException(ErrorCode.RELEASE_ROLLBACK_FAILED, "回滚版本失败: " + e.getMessage());
        }
    }

    @Override
    public List<MiniappRelease> getReleaseHistory() {
        return this.lambdaQuery()
                .eq(MiniappRelease::getStatus, 1)
                .orderByDesc(MiniappRelease::getMajor)
                .orderByDesc(MiniappRelease::getMinor)
                .orderByDesc(MiniappRelease::getPatch)
                .list();
    }

    @Override
    public List<MiniappRelease> listStoreTemplates() {
        warmStoreTemplateSeeder.ensureSystemStoreTemplates();
        List<MiniappRelease> list = this.lambdaQuery()
                .and(w -> w.eq(MiniappRelease::getMode, "template")
                        .or()
                        .eq(MiniappRelease::getStatus, 0)
                        .or()
                        .eq(MiniappRelease::getIsSystem, 1))
                .orderByDesc(MiniappRelease::getIsSystem)
                .orderByDesc(MiniappRelease::getIsCurrent)
                .orderByDesc(MiniappRelease::getUpdateTime)
                .list();
        for (MiniappRelease item : list) {
            item.setTemplateName(StoreTemplateNames.display(
                    item.getTemplateName(), item.getSemver(), item.getReleaseNotes()));
            item.setSnapshot(null);
            item.setBackupSnapshot(null);
        }
        return list;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MiniappRelease createStoreTemplate(String templateName) {
        CreateReleaseDTO dto = new CreateReleaseDTO();
        dto.setMode("template");
        dto.setChangeType("patch");
        dto.setTemplateName(templateName);
        dto.setReleaseNotes("整店模板");
        return createRelease(dto);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MiniappRelease duplicateStoreTemplate(Long id, String templateName) {
        MiniappRelease source = this.getById(id);
        BusinessException.throwIf(source == null, ErrorCode.RELEASE_NOT_FOUND);
        BusinessException.throwIf(!StringUtils.hasText(source.getSnapshot()), ErrorCode.DATA_NOT_FOUND.getCode(),
                "该模板没有可复制的版式快照");

        String name = StoreTemplateNames.normalize(templateName);
        if (name.isEmpty()) {
            name = StoreTemplateNames.duplicateOf(StoreTemplateNames.display(
                    source.getTemplateName(), source.getSemver(), source.getReleaseNotes()));
        }
        name = uniqueTemplateName(name, null);

        String semver = generateNextSemver("patch");
        String[] parts = semver.split("\\.");
        MiniappRelease copy = new MiniappRelease();
        copy.setSemver(semver);
        copy.setMajor(Integer.parseInt(parts[0]));
        copy.setMinor(Integer.parseInt(parts[1]));
        copy.setPatch(Integer.parseInt(parts[2]));
        copy.setChangeType("patch");
        copy.setReleaseNotes(source.getReleaseNotes());
        copy.setTemplateName(name);
        copy.setSnapshot(source.getSnapshot());
        copy.setPageCount(source.getPageCount());
        copy.setStatus(0);
        copy.setMode("template");
        copy.setIsCurrent(0);
        copy.setIsSystem(0);
        copy.setTemplateCode(null);
        this.save(copy);
        copy.setSnapshot(null);
        return copy;
    }

    @Override
    public MiniappRelease renameStoreTemplate(Long id, String templateName) {
        MiniappRelease target = this.getById(id);
        BusinessException.throwIf(target == null, ErrorCode.RELEASE_NOT_FOUND);
        String name = StoreTemplateNames.normalize(templateName);
        BusinessException.throwIf(name.isEmpty(), ErrorCode.PARAM_MISSING.getCode(), "请填写模板名称");
        assertTemplateNameUnique(name, id);
        target.setTemplateName(name);
        target.setMode("template");
        this.updateById(target);
        target.setSnapshot(null);
        target.setBackupSnapshot(null);
        return target;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MiniappRelease activateStoreTemplate(Long id) {
        MiniappRelease target = this.getById(id);
        BusinessException.throwIf(target == null, ErrorCode.RELEASE_NOT_FOUND);
        BusinessException.throwIf(!StringUtils.hasText(target.getSnapshot()),
                ErrorCode.DATA_NOT_FOUND.getCode(), "该模板快照为空，无法选用");

        MiniappRelease current = this.lambdaQuery()
                .eq(MiniappRelease::getIsCurrent, 1)
                .last("LIMIT 1")
                .one();
        if (current != null && !Objects.equals(current.getId(), target.getId())) {
            current.setSnapshot(buildSnapshot());
            this.updateById(current);
        }

        restoreSnapshotContent(target.getSnapshot(), false);

        this.lambdaUpdate()
                .eq(MiniappRelease::getIsCurrent, 1)
                .set(MiniappRelease::getIsCurrent, 0)
                .update();
        target.setIsCurrent(1);
        target.setMode("template");
        this.updateById(target);

        versionOperationLogService.logOperation(target.getId(), target.getSemver(), "activate_store_template",
                "套用整店模板(内容上线，非微信代码): " + StoreTemplateNames.display(
                        target.getTemplateName(), target.getSemver(), target.getReleaseNotes()),
                true, null, 0L);
        return sanitizeTemplate(target);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MiniappRelease captureStoreTemplate(Long id) {
        MiniappRelease target = this.getById(id);
        BusinessException.throwIf(target == null, ErrorCode.RELEASE_NOT_FOUND);
        String snapshot = buildSnapshot();
        target.setSnapshot(snapshot);
        target.setMode("template");
        if (target.getStatus() == null) {
            target.setStatus(0);
        }
        long pageCount = pageMapper.selectCount(new LambdaQueryWrapper<Page>()
                .eq(Page::getStatus, 1));
        target.setPageCount((int) pageCount);
        this.updateById(target);
        return sanitizeTemplate(target);
    }

    @Override
    public String generateNextSemver(String changeType) {
        MiniappRelease latest = this.lambdaQuery()
                .orderByDesc(MiniappRelease::getMajor)
                .orderByDesc(MiniappRelease::getMinor)
                .orderByDesc(MiniappRelease::getPatch)
                .last("LIMIT 1")
                .one();

        if (latest == null) {
            return "1.0.0";
        }

        int major = latest.getMajor();
        int minor = latest.getMinor();
        int patch = latest.getPatch();

        return switch (changeType) {
            case "major" -> (major + 1) + ".0.0";
            case "minor" -> major + "." + (minor + 1) + ".0";
            default -> major + "." + minor + "." + (patch + 1);
        };
    }

    // ==================== 私有方法 ====================

    private MiniappRelease sanitizeTemplate(MiniappRelease item) {
        item.setTemplateName(StoreTemplateNames.display(
                item.getTemplateName(), item.getSemver(), item.getReleaseNotes()));
        item.setSnapshot(null);
        item.setBackupSnapshot(null);
        return item;
    }

    private void assertTemplateNameUnique(String name, Long excludeId) {
        long count = this.lambdaQuery()
                .eq(MiniappRelease::getTemplateName, name)
                .eq(MiniappRelease::getMode, "template")
                .ne(excludeId != null, MiniappRelease::getId, excludeId)
                .count();
        BusinessException.throwIf(count > 0, ErrorCode.STORE_TEMPLATE_NAME_DUPLICATE);
    }

    private String uniqueTemplateName(String desired, Long excludeId) {
        String base = StoreTemplateNames.normalize(desired);
        if (base.isEmpty()) {
            base = "模板";
        }
        String candidate = base;
        int i = 2;
        while (this.lambdaQuery()
                .eq(MiniappRelease::getTemplateName, candidate)
                .eq(MiniappRelease::getMode, "template")
                .ne(excludeId != null, MiniappRelease::getId, excludeId)
                .count() > 0) {
            String suffix = " " + i;
            candidate = base.length() + suffix.length() > StoreTemplateNames.MAX_LEN
                    ? base.substring(0, StoreTemplateNames.MAX_LEN - suffix.length()) + suffix
                    : base + suffix;
            i++;
        }
        return candidate;
    }

    private String restoreSnapshotContent(String snapshotJson, boolean offlineExtraPages) {
        try {
            Map<String, Object> snapshotMap = objectMapper.readValue(snapshotJson, new TypeReference<Map<String, Object>>() {});

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> pages = (List<Map<String, Object>>) snapshotMap.get("pages");
            if (pages != null) {
                for (Map<String, Object> pageData : pages) {
                    String path = (String) pageData.get("path");
                    String name = (String) pageData.get("name");
                    String dslContent = (String) pageData.get("dslContent");

                    Page existingPage = pageMapper.selectOne(new LambdaQueryWrapper<Page>()
                            .eq(Page::getPath, path));

                    if (existingPage != null) {
                        Integer latestVersion = getLatestPageVersion(existingPage.getId());
                        int newVersionNum = latestVersion + 1;

                        PageVersion newVersion = new PageVersion();
                        newVersion.setPageId(existingPage.getId());
                        newVersion.setVersion(newVersionNum);
                        newVersion.setDslContent(dslContent);
                        newVersion.setStatus(0);
                        pageVersionMapper.insert(newVersion);

                        Long currentUserId = SecurityUtils.getCurrentUserId();
                        pageVersionMapper.selectList(new LambdaQueryWrapper<PageVersion>()
                                .eq(PageVersion::getPageId, existingPage.getId())
                                .eq(PageVersion::getStatus, 1)).forEach(pv -> {
                            pv.setStatus(2);
                            pageVersionMapper.updateById(pv);
                        });

                        newVersion.setStatus(1);
                        newVersion.setPublishedAt(LocalDateTime.now());
                        newVersion.setPublisherId(currentUserId);
                        pageVersionMapper.updateById(newVersion);

                        existingPage.setCurrentVersion(newVersionNum);
                        existingPage.setStatus(1);
                        pageMapper.updateById(existingPage);
                    } else {
                        Page newPage = new Page();
                        newPage.setName(name);
                        newPage.setPath(path);
                        newPage.setType(3);
                        newPage.setStatus(0);
                        newPage.setCurrentVersion(0);
                        pageMapper.insert(newPage);

                        PageVersion newVersion = new PageVersion();
                        newVersion.setPageId(newPage.getId());
                        newVersion.setVersion(1);
                        newVersion.setDslContent(dslContent);
                        newVersion.setStatus(0);
                        pageVersionMapper.insert(newVersion);

                        Long currentUserId = SecurityUtils.getCurrentUserId();
                        newVersion.setStatus(1);
                        newVersion.setPublishedAt(LocalDateTime.now());
                        newVersion.setPublisherId(currentUserId);
                        pageVersionMapper.updateById(newVersion);

                        newPage.setCurrentVersion(1);
                        newPage.setStatus(1);
                        pageMapper.updateById(newPage);
                    }
                }
            }

            applySystemConfigFromSnapshot(snapshotJson);

            Set<String> snapshotPaths = new LinkedHashSet<>();
            if (pages != null) {
                for (Map<String, Object> pageData : pages) {
                    String p = normalizePagePath(Objects.toString(pageData.get("path"), ""));
                    if (StringUtils.hasText(p)) {
                        snapshotPaths.add(p);
                    }
                }
            }
            List<Page> livePages = pageMapper.selectList(new LambdaQueryWrapper<Page>()
                    .eq(Page::getStatus, 1));
            List<String> extraNames = new ArrayList<>();
            if (livePages != null) {
                for (Page live : livePages) {
                    String livePath = normalizePagePath(live.getPath());
                    if (StringUtils.hasText(livePath) && !snapshotPaths.contains(livePath)) {
                        extraNames.add(live.getName() + "(" + livePath + ")");
                        if (offlineExtraPages) {
                            live.setStatus(0);
                            pageMapper.updateById(live);
                        }
                    }
                }
            }
            if (extraNames.isEmpty()) {
                return "";
            }
            if (offlineExtraPages) {
                return "；已下线快照外页面 " + extraNames.size() + " 个：" + String.join("、", extraNames);
            }
            String extraNote = "；快照外仍有已发布页面 " + extraNames.size() + " 个（未下线）："
                    + String.join("、", extraNames)
                    + "。如需一并下线请勾选 offlineExtraPages";
            log.warn("快照差异：{}", extraNote);
            return extraNote;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.DATA_UPDATE_FAILED, "写入模板内容失败: " + e.getMessage());
        }
    }

    private String buildSnapshot() {
        try {
            Map<String, Object> snapshot = new LinkedHashMap<>();

            Map<String, String> configs = loadConfigMap();
            Set<Long> boundIds = collectBoundPageIds(configs);

            List<Map<String, Object>> pageSnapshots = new ArrayList<>();
            for (Long pageId : boundIds) {
                Page page = pageMapper.selectById(pageId);
                if (page == null) {
                    continue;
                }
                Map<String, Object> pageInfo = new LinkedHashMap<>();
                pageInfo.put("pageId", page.getId());
                pageInfo.put("path", page.getPath());
                pageInfo.put("name", page.getName());

                PageVersion publishedVersion = pageVersionMapper.selectOne(new LambdaQueryWrapper<PageVersion>()
                        .eq(PageVersion::getPageId, page.getId())
                        .eq(PageVersion::getStatus, 1)
                        .orderByDesc(PageVersion::getVersion)
                        .last("LIMIT 1"));
                pageInfo.put("dslContent", publishedVersion != null ? publishedVersion.getDslContent() : null);

                pageSnapshots.add(pageInfo);
            }
            snapshot.put("pages", pageSnapshots);

            List<SystemConfig> systemConfigs = systemConfigMapper.selectList(null);
            Map<String, Object> systemConfigMap = new LinkedHashMap<>();
            for (SystemConfig config : systemConfigs) {
                String value = config.getConfigValue();
                if (StringUtils.hasText(value)) {
                    try {
                        Object parsed = objectMapper.readValue(value, Object.class);
                        systemConfigMap.put(config.getConfigKey(), parsed);
                    } catch (Exception e) {
                        systemConfigMap.put(config.getConfigKey(), value);
                    }
                } else {
                    systemConfigMap.put(config.getConfigKey(), value);
                }
            }
            snapshot.put("systemConfig", systemConfigMap);
            snapshot.put("validationWarnings", collectSnapshotWarnings(pageSnapshots, systemConfigMap));

            snapshot.put("createdAt", LocalDateTime.now().toString());

            return objectMapper.writeValueAsString(snapshot);
        } catch (Exception e) {
            log.error("构建快照失败", e);
            throw new BusinessException(ErrorCode.DATA_SAVE_FAILED, "构建快照失败: " + e.getMessage());
        }
    }

    private void validateSnapshotForRelease(String snapshotJson) {
        if (!StringUtils.hasText(snapshotJson)) {
            throw new BusinessException(ErrorCode.RELEASE_PROMOTE_FAILED, "发布快照为空，无法发布");
        }

        try {
            Map<String, Object> snapshot = objectMapper.readValue(snapshotJson, new TypeReference<Map<String, Object>>() {});

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> pages = (List<Map<String, Object>>) snapshot.get("pages");
            if (pages == null || pages.isEmpty()) {
                throw new BusinessException(ErrorCode.RELEASE_PROMOTE_FAILED, "发布快照中没有已发布页面");
            }

            List<String> errors = new ArrayList<>();
            for (Map<String, Object> page : pages) {
                String path = Objects.toString(page.get("path"), "");
                String dslContent = Objects.toString(page.get("dslContent"), "");
                if (!StringUtils.hasText(dslContent)) {
                    errors.add("页面 " + path + " 缺少 DSL 内容");
                    continue;
                }

                Map<String, Object> dsl = objectMapper.readValue(dslContent, new TypeReference<Map<String, Object>>() {});
                Object componentsValue = dsl.get("components");
                if (!(componentsValue instanceof List<?> components)) {
                    errors.add("页面 " + path + " 缺少 components 数组");
                    continue;
                }
                for (int i = 0; i < components.size(); i++) {
                    Object componentValue = components.get(i);
                    if (!(componentValue instanceof Map<?, ?> component)) {
                        errors.add("页面 " + path + " 的 components[" + i + "] 不是对象");
                        continue;
                    }
                    collectComponentTypeErrors(path, component, i, errors);
                }
            }

            if (!errors.isEmpty()) {
                throw new BusinessException(ErrorCode.RELEASE_PROMOTE_FAILED, "发布前校验失败：" + String.join("；", errors));
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.RELEASE_PROMOTE_FAILED, "发布前校验失败: " + e.getMessage());
        }
    }

    private void collectComponentTypeErrors(String path, Map<?, ?> component, int index, List<String> errors) {
        Object id = component.get("id");
        Object type = component.get("type");
        if (!StringUtils.hasText(Objects.toString(id, ""))) {
            errors.add("页面 " + path + " 的 components[" + index + "] 缺少 id");
        }
        String typeValue = Objects.toString(type, "");
        if (!StringUtils.hasText(typeValue)) {
            errors.add("页面 " + path + " 的 components[" + index + "] 缺少 type");
        } else if (!SUPPORTED_COMPONENT_TYPES.contains(typeValue)) {
            errors.add("页面 " + path + " 的 components[" + index + "] 使用未知组件类型: " + typeValue);
        }
        Object children = component.get("children");
        if (children instanceof List<?> childList) {
            for (int i = 0; i < childList.size(); i++) {
                Object child = childList.get(i);
                if (child instanceof Map<?, ?> childMap) {
                    collectComponentTypeErrors(path, childMap, i, errors);
                }
            }
        }
    }

    private List<String> collectSnapshotWarnings(List<Map<String, Object>> pageSnapshots, Map<String, Object> systemConfigMap) {
        List<String> warnings = new ArrayList<>();
        Set<String> pagePaths = pageSnapshots.stream()
                .map(page -> normalizePagePath(Objects.toString(page.get("path"), "")))
                .filter(StringUtils::hasText)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        Object tabbarValue = systemConfigMap.get("tabbarItems");
        if (!(tabbarValue instanceof List<?> tabs) || tabs.isEmpty()) {
            warnings.add("底部导航未配置，发布后将使用小程序默认导航");
            return warnings;
        }

        Map<String, List<String>> pathToNames = new LinkedHashMap<>();
        for (Object item : tabs) {
            if (!(item instanceof Map<?, ?> tab)) {
                warnings.add("底部导航存在无法识别的配置项");
                continue;
            }
            String text = firstText(tab.get("text"), tab.get("label"), tab.get("name"));
            String path = normalizePagePath(firstText(tab.get("pagePath"), tab.get("path"), tab.get("url")));
            if (!StringUtils.hasText(path)) {
                warnings.add("底部导航「" + fallbackText(text) + "」未绑定页面路径");
                continue;
            }
            pathToNames.computeIfAbsent(path, ignored -> new ArrayList<>()).add(fallbackText(text));
            if (!pagePaths.contains(path) && !isBuiltInMiniappPage(path)) {
                warnings.add("底部导航「" + fallbackText(text) + "」指向未发布页面: " + path);
            }
        }

        pathToNames.forEach((path, names) -> {
            if (names.size() > 1) {
                warnings.add("底部导航「" + String.join("、", names) + "」重复指向 " + path);
            }
        });
        return warnings;
    }

    private String firstText(Object... values) {
        for (Object value : values) {
            String text = Objects.toString(value, "");
            if (StringUtils.hasText(text)) {
                return text;
            }
        }
        return "";
    }

    private String fallbackText(String text) {
        return StringUtils.hasText(text) ? text : "未命名";
    }

    private String normalizePagePath(String path) {
        if (!StringUtils.hasText(path)) {
            return "";
        }
        String normalized = path.trim();
        return normalized.startsWith("/") ? normalized.substring(1) : normalized;
    }

    private boolean isBuiltInMiniappPage(String path) {
        return Set.of(
                "pages/index/index",
                "pages/discover/discover",
                "pages/planet/planet",
                "pages/shop/shop",
                "pages/mine/mine",
                "pages/ai-chat/ai-chat",
                "pages/login/login",
                "pages/content-list/content-list",
                "pages/product-list/product-list",
                "pages/category/category",
                "pages/cart/cart"
        ).contains(path);
    }

    /** 模板套用时跳过微信账号类配置，避免把种子里的 AppID 盖到目标站 */
    private boolean shouldSkipConfigOnTemplateApply(String key) {
        if (!StringUtils.hasText(key)) {
            return true;
        }
        String k = key.toLowerCase();
        return k.startsWith("wx_")
                || k.equals("appid")
                || k.equals("uploadkey")
                || k.equals("originalid")
                || k.contains("push_target");
    }

    private void applySystemConfigFromSnapshot(String snapshotJson) {
        if (!StringUtils.hasText(snapshotJson)) {
            return;
        }
        try {
            Map<String, Object> snapshotMap = objectMapper.readValue(snapshotJson, new TypeReference<Map<String, Object>>() {});
            @SuppressWarnings("unchecked")
            Map<String, Object> systemConfig = (Map<String, Object>) snapshotMap.get("systemConfig");
            if (systemConfig == null || systemConfig.isEmpty()) {
                return;
            }
            for (Map.Entry<String, Object> entry : systemConfig.entrySet()) {
                String key = entry.getKey();
                // 套用模板/回滚只改外观与业务配置，绝不覆盖微信密钥与支付密钥
                if (isSensitiveConfigKey(key) || shouldSkipConfigOnTemplateApply(key)) {
                    continue;
                }
                String value = entry.getValue() instanceof String
                        ? (String) entry.getValue()
                        : objectMapper.writeValueAsString(entry.getValue());

                SystemConfig config = systemConfigMapper.selectOne(new LambdaQueryWrapper<SystemConfig>()
                        .eq(SystemConfig::getConfigKey, key));
                if (config != null) {
                    config.setConfigValue(value);
                    systemConfigMapper.updateById(config);
                } else {
                    SystemConfig newConfig = new SystemConfig();
                    newConfig.setConfigKey(key);
                    newConfig.setConfigValue(value);
                    systemConfigMapper.insert(newConfig);
                }
            }
        } catch (Exception e) {
            log.error("从快照写入系统配置失败", e);
            throw new BusinessException(ErrorCode.DATA_UPDATE_FAILED, "写入系统配置失败: " + e.getMessage());
        }
    }

    private Integer getLatestPageVersion(Long pageId) {
        PageVersion latest = pageVersionMapper.selectOne(new LambdaQueryWrapper<PageVersion>()
                .eq(PageVersion::getPageId, pageId)
                .orderByDesc(PageVersion::getVersion)
                .last("LIMIT 1"));
        return latest != null ? latest.getVersion() : 0;
    }

    private void publishBoundPagesOrThrow() {
        PublishPreflightVO vo = buildPreflight();
        if (!vo.isCanPublish()) {
            throw new BusinessException(ErrorCode.RELEASE_PROMOTE_FAILED,
                    "无法发布：" + String.join("；", vo.getBlocking()));
        }
        Long publisherId = SecurityUtils.getCurrentUserId();
        for (PublishPreflightVO.Item item : vo.getPages()) {
            if (!"publish".equals(item.getAction()) || item.getId() == null) {
                continue;
            }
            publishLatestDraft(item.getId(), publisherId);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> publishContentToMiniapp() {
        // 草稿提升由 Controller 先调 SystemConfigService；此处按合并后的配置发布脏页
        PublishPreflightVO before = buildPreflight();
        publishBoundPagesOrThrow();
        Map<String, Object> result = new LinkedHashMap<>();
        long published = before.getPages().stream().filter(p -> "publish".equals(p.getAction())).count();
        result.put("publishedPages", published);
        result.put("warnings", before.getWarnings());
        result.put("message", "已上线到小程序（导航配置请确认已保存草稿）");
        return result;
    }

    private PublishPreflightVO buildPreflight() {
        PublishPreflightVO vo = new PublishPreflightVO();
        Map<String, String> configs = loadConfigMap();
        List<Map<String, Object>> tabs = parseTabItems(configs.get("tabbarItems"));
        Long homeId = parseLongId(configs.get("miniappHomePageId"));

        if (homeId == null) {
            Page home = pageMapper.selectOne(new LambdaQueryWrapper<Page>()
                    .eq(Page::getType, 1)
                    .last("LIMIT 1"));
            if (home != null) {
                homeId = home.getId();
            }
        }
        if (homeId == null) {
            vo.getBlocking().add("尚未绑定首页，请先在「导航与外观」选择首页");
        }

        Set<Long> boundIds = collectBoundPageIds(configs);

        if (tabs.isEmpty()) {
            vo.getWarnings().add("尚未配置底部导航，发布后将使用小程序默认导航");
        } else if (tabs.size() < 2 || tabs.size() > 5) {
            vo.getBlocking().add("底部导航需配置 2~5 个入口（当前 " + tabs.size() + " 个），请到「外观」调整");
        }
        for (Map<String, Object> tab : tabs) {
            String text = firstText(tab.get("text"), tab.get("label"), tab.get("name"));
            String path = normalizePagePath(firstText(tab.get("pagePath"), tab.get("path"), tab.get("url")));
            Long pageId = parseLongId(tab.get("pageId"));
            if (pageId == null && !isBuiltInMiniappPage(path)) {
                vo.getBlocking().add("导航「" + fallbackText(text) + "」尚未绑定页面");
            }
        }

        for (Long id : boundIds) {
            Page page = pageMapper.selectById(id);
            PublishPreflightVO.Item item = new PublishPreflightVO.Item();
            item.setId(id);
            if (page == null) {
                item.setName("未知页面 #" + id);
                item.setAction("empty");
                vo.getBlocking().add("绑定的页面不存在：#" + id);
                vo.getPages().add(item);
                continue;
            }
            item.setName(page.getName());
            item.setPath(page.getPath());
            item.setStatus(page.getStatus());
            PageVersion latest = pageVersionMapper.selectOne(new LambdaQueryWrapper<PageVersion>()
                    .eq(PageVersion::getPageId, id)
                    .orderByDesc(PageVersion::getVersion)
                    .last("LIMIT 1"));
            if (latest == null || !StringUtils.hasText(latest.getDslContent()) || isEmptyCanvas(latest.getDslContent())) {
                item.setAction("empty");
                vo.getBlocking().add("页面「" + page.getName() + "」还没有内容，请先装修");
            } else if (Integer.valueOf(1).equals(latest.getStatus()) && Integer.valueOf(1).equals(page.getStatus())) {
                item.setAction("already_live");
            } else {
                item.setAction("publish");
            }
            vo.getPages().add(item);
        }

        vo.setCanPublish(vo.getBlocking().isEmpty() && !boundIds.isEmpty());
        if (boundIds.isEmpty() && vo.getBlocking().isEmpty()) {
            vo.getBlocking().add("没有可发布的绑定页面");
            vo.setCanPublish(false);
        }
        appendAdvancedPreflightChecks(vo, boundIds);
        vo.setCanPublish(vo.getBlocking().isEmpty() && !boundIds.isEmpty());
        return vo;
    }

    /** P1: 组件白名单前移、图片 localhost、数据源空配置、外链域名警告 */
    private void appendAdvancedPreflightChecks(PublishPreflightVO vo, Set<Long> boundIds) {
        Set<String> unknownTypes = new LinkedHashSet<>();
        Set<String> sampleLocalhost = new LinkedHashSet<>();
        Set<String> sampleExternalHttp = new LinkedHashSet<>();
        int emptyDatasourceHits = 0;

        for (Long id : boundIds) {
            PageVersion latest = pageVersionMapper.selectOne(new LambdaQueryWrapper<PageVersion>()
                    .eq(PageVersion::getPageId, id)
                    .orderByDesc(PageVersion::getVersion)
                    .last("LIMIT 1"));
            if (latest == null || !StringUtils.hasText(latest.getDslContent())) {
                continue;
            }
            try {
                Map<String, Object> dsl = objectMapper.readValue(latest.getDslContent(), new TypeReference<Map<String, Object>>() {});
                Object componentsValue = dsl.get("components");
                if (!(componentsValue instanceof List<?> components)) {
                    continue;
                }
                walkComponentsForPreflight(components, unknownTypes, sampleLocalhost, sampleExternalHttp);
                emptyDatasourceHits += countEmptyDatasources(components);
            } catch (Exception e) {
                vo.getWarnings().add("页面 #" + id + " DSL 解析失败，跳过深度检查");
            }
        }

        if (!unknownTypes.isEmpty()) {
            vo.getBlocking().add("存在未知组件类型（请先升级小程序渲染端）：" + String.join("、", unknownTypes));
        }
        if (!sampleLocalhost.isEmpty()) {
            vo.getBlocking().add("页面资源指向 localhost/127.0.0.1（上线后必裂图），示例："
                    + sampleLocalhost.stream().limit(3).collect(Collectors.joining("；")));
        }
        if (emptyDatasourceHits > 0) {
            vo.getWarnings().add("有 " + emptyDatasourceHits + " 个数据源组件未配置有效 query/params，上线后模块可能为空");
        }
        if (!sampleExternalHttp.isEmpty()) {
            vo.getWarnings().add("检测到非 HTTPS 外链，请确认微信合法域名配置。示例："
                    + sampleExternalHttp.stream().limit(3).collect(Collectors.joining("；")));
        }
    }

    private void walkComponentsForPreflight(List<?> components, Set<String> unknownTypes,
                                            Set<String> sampleLocalhost, Set<String> sampleExternalHttp) {
        if (components == null) return;
        for (Object componentValue : components) {
            if (!(componentValue instanceof Map<?, ?> component)) continue;
            String typeValue = Objects.toString(component.get("type"), "");
            if (StringUtils.hasText(typeValue) && !SUPPORTED_COMPONENT_TYPES.contains(typeValue)) {
                unknownTypes.add(typeValue);
            }
            Object props = component.get("props");
            if (props instanceof Map<?, ?> propsMap) {
                scanUrlsInMap(propsMap, sampleLocalhost, sampleExternalHttp);
            }
            Object style = component.get("style");
            if (style instanceof Map<?, ?> styleMap) {
                scanUrlsInMap(styleMap, sampleLocalhost, sampleExternalHttp);
            }
            Object children = component.get("children");
            if (children instanceof List<?> childList) {
                walkComponentsForPreflight(childList, unknownTypes, sampleLocalhost, sampleExternalHttp);
            }
        }
    }

    private int countEmptyDatasources(List<?> components) {
        int count = 0;
        if (components == null) return 0;
        for (Object componentValue : components) {
            if (!(componentValue instanceof Map<?, ?> component)) continue;
            String type = Objects.toString(component.get("type"), "");
            Object ds = component.get("data_source");
            if (ds == null && component.get("props") instanceof Map<?, ?> props) {
                ds = props.get("data_source");
            }
            boolean needsDs = Set.of("product_list", "article_list", "article_feed", "note_feed",
                    "moments_feed", "hot_news", "activity_list", "flash_sale").contains(type);
            if (needsDs) {
                if (!(ds instanceof Map<?, ?> dsMap) || dsMap.isEmpty()) {
                    count++;
                } else {
                    Object params = dsMap.get("params");
                    Object query = dsMap.get("query");
                    boolean emptyParams = !(params instanceof Map<?, ?> m) || m.isEmpty();
                    boolean emptyQuery = !(query instanceof Map<?, ?> q) || q.isEmpty();
                    Object dsType = dsMap.get("type");
                    if (emptyParams && emptyQuery && dsType == null) {
                        count++;
                    }
                }
            }
            Object children = component.get("children");
            if (children instanceof List<?> childList) {
                count += countEmptyDatasources(childList);
            }
        }
        return count;
    }

    private void scanUrlsInMap(Map<?, ?> map, Set<String> sampleLocalhost, Set<String> sampleExternalHttp) {
        for (Object value : map.values()) {
            if (value instanceof String s) {
                classifyUrl(s, sampleLocalhost, sampleExternalHttp);
            } else if (value instanceof List<?> list) {
                for (Object item : list) {
                    if (item instanceof String s) {
                        classifyUrl(s, sampleLocalhost, sampleExternalHttp);
                    } else if (item instanceof Map<?, ?> m) {
                        scanUrlsInMap(m, sampleLocalhost, sampleExternalHttp);
                    }
                }
            } else if (value instanceof Map<?, ?> m) {
                scanUrlsInMap(m, sampleLocalhost, sampleExternalHttp);
            }
        }
    }

    private void classifyUrl(String raw, Set<String> sampleLocalhost, Set<String> sampleExternalHttp) {
        if (!StringUtils.hasText(raw)) return;
        String url = raw.trim().toLowerCase(Locale.ROOT);
        if (!(url.startsWith("http://") || url.startsWith("https://"))) return;
        if (url.contains("localhost") || url.contains("127.0.0.1")) {
            if (sampleLocalhost.size() < 5) sampleLocalhost.add(raw.trim());
            return;
        }
        if (url.startsWith("http://") && sampleExternalHttp.size() < 5) {
            sampleExternalHttp.add(raw.trim());
        }
    }

    private void publishLatestDraft(Long pageId, Long publisherId) {
        Page page = pageMapper.selectById(pageId);
        if (page == null) {
            throw new BusinessException(ErrorCode.RELEASE_PROMOTE_FAILED, "页面不存在: " + pageId);
        }
        PageVersion latest = pageVersionMapper.selectOne(new LambdaQueryWrapper<PageVersion>()
                .eq(PageVersion::getPageId, pageId)
                .orderByDesc(PageVersion::getVersion)
                .last("LIMIT 1"));
        if (latest == null) {
            throw new BusinessException(ErrorCode.RELEASE_PROMOTE_FAILED, "页面没有可发布的版本: " + page.getName());
        }
        pageVersionMapper.update(null, new LambdaUpdateWrapper<PageVersion>()
                .eq(PageVersion::getPageId, pageId)
                .eq(PageVersion::getStatus, 1)
                .ne(PageVersion::getId, latest.getId())
                .set(PageVersion::getStatus, 2));
        latest.setStatus(1);
        latest.setPublishedAt(LocalDateTime.now());
        latest.setPublisherId(publisherId);
        pageVersionMapper.updateById(latest);
        page.setStatus(1);
        page.setCurrentVersion(latest.getVersion());
        pageMapper.updateById(page);
    }

    private Map<String, String> loadConfigMap() {
        Map<String, String> map = new HashMap<>();
        List<SystemConfig> configs = systemConfigMapper.selectList(null);
        if (configs == null) {
            return map;
        }
        for (SystemConfig config : configs) {
            map.put(config.getConfigKey(), config.getConfigValue());
        }
        // 预检/上线以品牌导航草稿为准（未上线前真机仍读 live 键）
        String draftRaw = map.get("site_builder_draft");
        if (StringUtils.hasText(draftRaw)) {
            try {
                Map<String, Object> draft = objectMapper.readValue(draftRaw, new TypeReference<Map<String, Object>>() {});
                for (Map.Entry<String, Object> e : draft.entrySet()) {
                    Object val = e.getValue();
                    if (val == null) {
                        map.put(e.getKey(), "");
                    } else if (val instanceof String s) {
                        map.put(e.getKey(), s);
                    } else {
                        map.put(e.getKey(), objectMapper.writeValueAsString(val));
                    }
                }
            } catch (Exception e) {
                log.warn("合并 site_builder_draft 失败: {}", e.getMessage());
            }
        }
        return map;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> parseTabItems(String raw) {
        if (!StringUtils.hasText(raw)) {
            return List.of();
        }
        try {
            Object parsed = objectMapper.readValue(raw, Object.class);
            if (parsed instanceof List<?> list) {
                List<Map<String, Object>> tabs = new ArrayList<>();
                for (Object item : list) {
                    if (item instanceof Map<?, ?> map) {
                        tabs.add((Map<String, Object>) map);
                    }
                }
                return tabs;
            }
        } catch (Exception e) {
            log.warn("解析底部导航配置失败: {}", e.getMessage());
        }
        return List.of();
    }

    @Override
    public void syncPublishedPageToLatestSnapshot(String path, String name, String dslContent) {
        if (!StringUtils.hasText(path) || !StringUtils.hasText(dslContent)) {
            return;
        }
        MiniappRelease latest = getLatestRelease();
        if (latest == null || !StringUtils.hasText(latest.getSnapshot())) {
            return;
        }
        try {
            Map<String, Object> snapshot = objectMapper.readValue(
                    latest.getSnapshot(),
                    new TypeReference<Map<String, Object>>() {}
            );
            List<Map<String, Object>> pages = new ArrayList<>();
            Object pagesValue = snapshot.get("pages");
            if (pagesValue instanceof List<?> list) {
                for (Object item : list) {
                    if (item instanceof Map<?, ?> raw) {
                        Map<String, Object> page = new LinkedHashMap<>();
                        raw.forEach((k, v) -> page.put(String.valueOf(k), v));
                        pages.add(page);
                    }
                }
            }
            String normalized = normalizeSnapshotPath(path);
            boolean found = false;
            for (Map<String, Object> page : pages) {
                if (normalized.equals(normalizeSnapshotPath(Objects.toString(page.get("path"), "")))) {
                    page.put("dslContent", dslContent);
                    if (StringUtils.hasText(name)) {
                        page.put("name", name);
                    }
                    found = true;
                    break;
                }
            }
            if (!found) {
                Map<String, Object> pageInfo = new LinkedHashMap<>();
                pageInfo.put("path", path);
                pageInfo.put("name", name);
                pageInfo.put("dslContent", dslContent);
                pages.add(pageInfo);
            }
            snapshot.put("pages", pages);
            latest.setSnapshot(objectMapper.writeValueAsString(snapshot));
            this.updateById(latest);
        } catch (Exception e) {
            log.warn("同步已发布页面到线上快照失败 path={}", path, e);
        }
    }

    private String normalizeSnapshotPath(String path) {
        if (path == null) {
            return "";
        }
        String normalized = path.trim();
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        return normalized;
    }

    private Long parseLongId(Object raw) {
        if (raw == null) {
            return null;
        }
        if (raw instanceof Number number) {
            long value = number.longValue();
            return value > 0 ? value : null;
        }
        String text = String.valueOf(raw).trim();
        if (!StringUtils.hasText(text) || text.startsWith("__")) {
            return null;
        }
        try {
            long value = Long.parseLong(text);
            return value > 0 ? value : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** 导航与外观绑定的页面 ID：首页 + TabBar 绑定页 + 我的页（若绑定自定义页） */
    private Set<Long> collectBoundPageIds(Map<String, String> configs) {
        Set<Long> boundIds = new LinkedHashSet<>();
        Long homeId = parseLongId(configs.get("miniappHomePageId"));
        Long mineId = parseLongId(configs.get("miniappMinePageId"));
        if (homeId == null) {
            Page home = pageMapper.selectOne(new LambdaQueryWrapper<Page>()
                    .eq(Page::getType, 1)
                    .last("LIMIT 1"));
            if (home != null) {
                homeId = home.getId();
            }
        }
        if (homeId != null) {
            boundIds.add(homeId);
        }
        if (mineId != null) {
            boundIds.add(mineId);
        }
        for (Map<String, Object> tab : parseTabItems(configs.get("tabbarItems"))) {
            Long pageId = parseLongId(tab.get("pageId"));
            if (pageId != null) {
                boundIds.add(pageId);
            }
        }
        return boundIds;
    }

    private boolean isEmptyCanvas(String dslContent) {
        try {
            Map<String, Object> dsl = objectMapper.readValue(dslContent, new TypeReference<Map<String, Object>>() {});
            Object components = dsl.get("components");
            return !(components instanceof List<?> list) || list.isEmpty();
        } catch (Exception e) {
            return true;
        }
    }

    private String sanitizeSnapshotForClient(String snapshotJson) {
        if (!StringUtils.hasText(snapshotJson)) {
            return snapshotJson;
        }
        try {
            Map<String, Object> snapshot = objectMapper.readValue(snapshotJson, new TypeReference<Map<String, Object>>() {});
            Object systemConfigObj = snapshot.get("systemConfig");
            if (systemConfigObj instanceof Map<?, ?> rawMap) {
                @SuppressWarnings("unchecked")
                Map<String, Object> systemConfig = (Map<String, Object>) rawMap;
                List<String> toRemove = new ArrayList<>();
                for (String key : systemConfig.keySet()) {
                    if (isSensitiveConfigKey(key)) {
                        toRemove.add(key);
                    }
                }
                for (String key : toRemove) {
                    systemConfig.remove(key);
                }
            }
            snapshot.remove("backup_snapshot");
            return objectMapper.writeValueAsString(snapshot);
        } catch (Exception e) {
            log.warn("sanitize snapshot for client failed: {}", e.getMessage());
            return snapshotJson;
        }
    }

    private boolean isSensitiveConfigKey(String key) {
        if (!StringUtils.hasText(key)) {
            return false;
        }
        String k = key.toLowerCase();
        return k.contains("secret")
                || k.contains("private_key")
                || k.contains("privatekey")
                || k.endsWith("_key")
                || k.equals("wx_upload_key")
                || k.equals("wx_mch_key")
                || k.equals("apiv3key")
                || k.equals("access_secret")
                || k.equals("sms_access_secret")
                || k.equals("storage_oss_access_secret");
    }

    private String getCurrentUsername() {
        try {
            var authentication = SecurityUtils.getAuthentication();
            if (authentication != null && authentication.isAuthenticated()
                    && !"anonymousUser".equals(authentication.getPrincipal())) {
                return authentication.getName();
            }
        } catch (Exception e) {
            log.warn("获取当前用户名失败: {}", e.getMessage());
        }
        return "system";
    }
}
