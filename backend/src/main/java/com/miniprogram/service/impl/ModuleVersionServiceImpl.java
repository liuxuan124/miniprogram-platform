package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.module.CreateModuleVersionDTO;
import com.miniprogram.dto.module.ModuleVersionQueryDTO;
import com.miniprogram.entity.ModuleVersion;
import com.miniprogram.mapper.ModuleVersionMapper;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.ModuleVersionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ModuleVersionServiceImpl extends BaseServiceImpl<ModuleVersionMapper, ModuleVersion> implements ModuleVersionService {

    @Override
    public PageResult<ModuleVersion> listVersions(ModuleVersionQueryDTO query) {
        LambdaQueryWrapper<ModuleVersion> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(StringUtils.hasText(query.getModuleType()), ModuleVersion::getModuleType, query.getModuleType())
                .eq(query.getTargetId() != null, ModuleVersion::getTargetId, query.getTargetId())
                .like(StringUtils.hasText(query.getKeyword()), ModuleVersion::getSemver, query.getKeyword())
                .or(w -> w.like(StringUtils.hasText(query.getKeyword()), ModuleVersion::getChangeSummary, query.getKeyword()))
                .eq(query.getStatus() != null, ModuleVersion::getStatus, query.getStatus());
        wrapper.orderByDesc(ModuleVersion::getMajor)
                .orderByDesc(ModuleVersion::getMinor)
                .orderByDesc(ModuleVersion::getPatch);

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<ModuleVersion> page =
                this.page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(query.getCurrent(), query.getSize()), wrapper);

        return PageResult.of(page);
    }

    @Override
    public List<ModuleVersion> listVersionsByTarget(String moduleType, Long targetId) {
        return this.lambdaQuery()
                .eq(ModuleVersion::getModuleType, moduleType)
                .eq(ModuleVersion::getTargetId, targetId)
                .orderByDesc(ModuleVersion::getMajor)
                .orderByDesc(ModuleVersion::getMinor)
                .orderByDesc(ModuleVersion::getPatch)
                .list();
    }

    @Override
    public ModuleVersion getVersionDetail(Long id) {
        ModuleVersion version = this.getById(id);
        BusinessException.throwIf(version == null, ErrorCode.RELEASE_NOT_FOUND);
        return version;
    }

    @Override
    public ModuleVersion getLatestPublished(String moduleType, Long targetId) {
        return this.lambdaQuery()
                .eq(ModuleVersion::getModuleType, moduleType)
                .eq(ModuleVersion::getTargetId, targetId)
                .eq(ModuleVersion::getStatus, 1)
                .orderByDesc(ModuleVersion::getMajor)
                .orderByDesc(ModuleVersion::getMinor)
                .orderByDesc(ModuleVersion::getPatch)
                .last("LIMIT 1")
                .one();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ModuleVersion createVersion(CreateModuleVersionDTO dto) {
        String semver = generateNextSemver(dto.getModuleType(), dto.getTargetId());

        String[] parts = semver.split("\\.");
        int major = Integer.parseInt(parts[0]);
        int minor = Integer.parseInt(parts[1]);
        int patch = Integer.parseInt(parts[2]);

        ModuleVersion version = new ModuleVersion();
        version.setModuleType(dto.getModuleType());
        version.setTargetId(dto.getTargetId());
        version.setSemver(semver);
        version.setMajor(major);
        version.setMinor(minor);
        version.setPatch(patch);
        version.setVersionData(dto.getVersionData());
        version.setChangeSummary(dto.getChangeSummary());
        version.setStatus(0);

        this.save(version);
        log.info("创建模块版本: moduleType={}, targetId={}, semver={}", dto.getModuleType(), dto.getTargetId(), semver);
        return version;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ModuleVersion publishVersion(Long id) {
        ModuleVersion version = this.getById(id);
        BusinessException.throwIf(version == null, ErrorCode.RELEASE_NOT_FOUND);

        ModuleVersion currentPublished = this.lambdaQuery()
                .eq(ModuleVersion::getModuleType, version.getModuleType())
                .eq(ModuleVersion::getTargetId, version.getTargetId())
                .eq(ModuleVersion::getStatus, 1)
                .one();

        if (currentPublished != null) {
            currentPublished.setStatus(2);
            this.updateById(currentPublished);
        }

        Long currentUserId = SecurityUtils.getCurrentUserId();
        version.setStatus(1);
        version.setPublishedAt(LocalDateTime.now());
        version.setPublisherId(currentUserId);
        version.setPublisherName(getCurrentUsername());
        this.updateById(version);

        log.info("发布模块版本: id={}, moduleType={}, targetId={}, semver={}",
                id, version.getModuleType(), version.getTargetId(), version.getSemver());
        return version;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ModuleVersion rollbackVersion(Long id, String reason) {
        ModuleVersion target = this.getById(id);
        BusinessException.throwIf(target == null, ErrorCode.RELEASE_NOT_FOUND);
        BusinessException.throwIf(target.getStatus() != 1, ErrorCode.RELEASE_NOT_PUBLISHED.getCode(),
                "只能回滚已发布的版本");

        ModuleVersion currentPublished = this.lambdaQuery()
                .eq(ModuleVersion::getModuleType, target.getModuleType())
                .eq(ModuleVersion::getTargetId, target.getTargetId())
                .eq(ModuleVersion::getStatus, 1)
                .one();

        if (currentPublished != null && !currentPublished.getId().equals(id)) {
            Long currentUserId = SecurityUtils.getCurrentUserId();
            currentPublished.setStatus(2);
            currentPublished.setRolledBackAt(LocalDateTime.now());
            currentPublished.setRolledBackBy(currentUserId);
            this.updateById(currentPublished);
        }

        Long currentUserId = SecurityUtils.getCurrentUserId();
        target.setStatus(1);
        target.setRolledBackAt(null);
        target.setRolledBackBy(null);
        this.updateById(target);

        log.info("回滚模块版本: id={}, moduleType={}, targetId={}, reason={}",
                id, target.getModuleType(), target.getTargetId(), reason);
        return target;
    }

    @Override
    public void deleteVersion(Long id) {
        ModuleVersion version = this.getById(id);
        BusinessException.throwIf(version == null, ErrorCode.RELEASE_NOT_FOUND);
        BusinessException.throwIf(version.getStatus() == 1, ErrorCode.RELEASE_DELETE_FORBIDDEN.getCode(),
                "不能删除已发布的版本");

        this.lambdaUpdate()
                .eq(ModuleVersion::getId, id)
                .set(ModuleVersion::getDeleted, 1)
                .update();
    }

    @Override
    public Map<String, Object> getVersionStats(String moduleType) {
        Map<String, Object> stats = new HashMap<>();

        long total = this.lambdaQuery()
                .eq(StringUtils.hasText(moduleType), ModuleVersion::getModuleType, moduleType)
                .count();
        stats.put("total", total);

        long draft = this.lambdaQuery()
                .eq(StringUtils.hasText(moduleType), ModuleVersion::getModuleType, moduleType)
                .eq(ModuleVersion::getStatus, 0)
                .count();
        stats.put("draft", draft);

        long published = this.lambdaQuery()
                .eq(StringUtils.hasText(moduleType), ModuleVersion::getModuleType, moduleType)
                .eq(ModuleVersion::getStatus, 1)
                .count();
        stats.put("published", published);

        long rolledBack = this.lambdaQuery()
                .eq(StringUtils.hasText(moduleType), ModuleVersion::getModuleType, moduleType)
                .eq(ModuleVersion::getStatus, 2)
                .count();
        stats.put("rolledBack", rolledBack);

        return stats;
    }

    private String generateNextSemver(String moduleType, Long targetId) {
        ModuleVersion latest = this.lambdaQuery()
                .eq(ModuleVersion::getModuleType, moduleType)
                .eq(ModuleVersion::getTargetId, targetId)
                .orderByDesc(ModuleVersion::getMajor)
                .orderByDesc(ModuleVersion::getMinor)
                .orderByDesc(ModuleVersion::getPatch)
                .last("LIMIT 1")
                .one();

        if (latest == null) {
            return "1.0.0";
        }

        int major = latest.getMajor();
        int minor = latest.getMinor();
        int patch = latest.getPatch() + 1;

        return major + "." + minor + "." + patch;
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
