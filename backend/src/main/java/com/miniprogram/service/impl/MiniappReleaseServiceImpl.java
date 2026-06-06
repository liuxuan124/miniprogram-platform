package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.miniapp.CreateReleaseDTO;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MiniappReleaseServiceImpl extends BaseServiceImpl<MiniappReleaseMapper, MiniappRelease> implements MiniappReleaseService {

    private static final Set<String> SUPPORTED_COMPONENT_TYPES = Set.of(
            "search", "notice_bar", "category_nav", "banner", "nav", "product_list",
            "flash_sale", "article_list", "activity_entry", "activity_list",
            "appointment_service", "member_card", "coupon", "ai_entry", "video",
            "brand_intro", "image_text", "contact_info", "certificate", "countdown",
            "float_button", "rich_text", "section_title", "divider", "spacer"
    );

    private final PageMapper pageMapper;
    private final PageVersionMapper pageVersionMapper;
    private final SystemConfigMapper systemConfigMapper;
    private final VersionOperationLogService versionOperationLogService;
    private final ObjectMapper objectMapper;

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

            MiniappRelease release = new MiniappRelease();
            release.setSemver(semver);
            release.setMajor(major);
            release.setMinor(minor);
            release.setPatch(patch);
            release.setChangeType(dto.getChangeType());
            release.setReleaseNotes(dto.getReleaseNotes());
            release.setSnapshot(snapshot);
            release.setMode(mode);

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
        BusinessException.throwIf(release.getStatus() != 0, ErrorCode.RELEASE_DELETE_FORBIDDEN.getCode(),
                "只能删除草稿/模板状态的版本，无法删除已发布或已回滚的版本");

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
                .eq(MiniappRelease::getStatus, 1)
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

            @SuppressWarnings("unchecked")
            Map<String, Object> systemConfig = (Map<String, Object>) snapshotMap.get("systemConfig");
            if (systemConfig != null) {
                for (Map.Entry<String, Object> entry : systemConfig.entrySet()) {
                    String key = entry.getKey();
                    String value = entry.getValue() instanceof String
                            ? (String) entry.getValue()
                            : objectMapper.writeValueAsString(entry.getValue());

                    SystemConfig config = systemConfigMapper.selectOne(new LambdaQueryWrapper<SystemConfig>()
                            .eq(SystemConfig::getConfigKey, key));
                    if (config != null) {
                        config.setConfigValue(value);
                        systemConfigMapper.updateById(config);
                    }
                }
            }

            MiniappRelease currentPublished = getLatestRelease();
            if (currentPublished != null) {
                currentPublished.setStatus(2);
                currentPublished.setRolledBackAt(LocalDateTime.now());
                currentPublished.setRolledBackBy(SecurityUtils.getCurrentUserId());
                currentPublished.setRolledBackFrom(currentPublished.getSemver());
                this.updateById(currentPublished);
            }

            MiniappRelease rollbackRelease = new MiniappRelease();
            rollbackRelease.setSemver(targetRelease.getSemver() + "-rollback-" + System.currentTimeMillis());
            rollbackRelease.setMajor(targetRelease.getMajor());
            rollbackRelease.setMinor(targetRelease.getMinor());
            rollbackRelease.setPatch(targetRelease.getPatch());
            rollbackRelease.setChangeType("patch");
            rollbackRelease.setReleaseNotes("回滚至版本 " + dto.getTargetSemver() + (StringUtils.hasText(dto.getReason()) ? "，原因: " + dto.getReason() : ""));
            rollbackRelease.setSnapshot(targetRelease.getSnapshot());
            rollbackRelease.setBackupSnapshot(backupSnapshot);
            rollbackRelease.setPageCount(targetRelease.getPageCount());
            rollbackRelease.setStatus(1);
            rollbackRelease.setPublishedAt(LocalDateTime.now());
            rollbackRelease.setPublisherId(SecurityUtils.getCurrentUserId());
            rollbackRelease.setPublisherName(getCurrentUsername());
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

    private String buildSnapshot() {
        try {
            Map<String, Object> snapshot = new LinkedHashMap<>();

            List<Page> publishedPages = pageMapper.selectList(new LambdaQueryWrapper<Page>()
                    .eq(Page::getStatus, 1));

            List<Map<String, Object>> pageSnapshots = new ArrayList<>();
            for (Page page : publishedPages) {
                Map<String, Object> pageInfo = new LinkedHashMap<>();
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

            List<SystemConfig> configs = systemConfigMapper.selectList(null);
            Map<String, Object> systemConfigMap = new LinkedHashMap<>();
            for (SystemConfig config : configs) {
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
                    Object id = component.get("id");
                    Object type = component.get("type");
                    if (!StringUtils.hasText(Objects.toString(id, ""))) {
                        errors.add("页面 " + path + " 的 components[" + i + "] 缺少 id");
                    }
                    String typeValue = Objects.toString(type, "");
                    if (!StringUtils.hasText(typeValue)) {
                        errors.add("页面 " + path + " 的 components[" + i + "] 缺少 type");
                    } else if (!SUPPORTED_COMPONENT_TYPES.contains(typeValue)) {
                        errors.add("页面 " + path + " 的 components[" + i + "] 使用未知组件类型: " + typeValue);
                    }
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
                "pages/mine/mine",
                "pages/ai-chat/ai-chat",
                "pages/login/login",
                "pages/content-list/content-list",
                "pages/product-list/product-list",
                "pages/category/category",
                "pages/cart/cart"
        ).contains(path);
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
