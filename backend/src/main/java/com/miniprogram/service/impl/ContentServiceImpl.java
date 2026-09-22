package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.ContentAttachmentDTO;
import com.miniprogram.dto.ContentDTO;
import com.miniprogram.dto.ContentDetailDTO;
import com.miniprogram.dto.ContentQueryDTO;
import com.miniprogram.dto.ContentStatsDTO;
import com.miniprogram.entity.Content;
import com.miniprogram.entity.ContentTag;
import com.miniprogram.member.MemberBenefitCodes;
import com.miniprogram.mapper.ContentMapper;
import com.miniprogram.mapper.ContentTagMapper;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.ContentAuditRulesService;
import com.miniprogram.service.ContentCategoryService;
import com.miniprogram.service.ContentService;
import com.miniprogram.service.FileEntitlementService;
import com.miniprogram.service.MembershipAccessService;
import com.miniprogram.service.SystemConfigService;
import com.miniprogram.service.knowledge.KnowledgeSyncService;
import com.miniprogram.util.ContentSourceResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * 内容文章 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContentServiceImpl extends BaseServiceImpl<ContentMapper, Content>
        implements ContentService {

    private final ContentCategoryService categoryService;
    private final ContentTagMapper tagMapper;
    private final ObjectMapper objectMapper;
    private final FileEntitlementService fileEntitlementService;
    private final MembershipAccessService membershipAccessService;
    private final ContentAuditRulesService contentAuditRulesService;
    private final SystemConfigService systemConfigService;
    private final KnowledgeSyncService knowledgeSyncService;

    @Override
    public PageResult<ContentDetailDTO> listContents(ContentQueryDTO queryDTO) {
        LambdaQueryWrapper<Content> wrapper = buildQueryWrapper(queryDTO);
        wrapper.orderByAsc(Content::getSortOrder);
        wrapper.orderByDesc(Content::getUpdateTime);
        wrapper.orderByDesc(Content::getId);

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<Content> page =
                this.page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(
                        queryDTO.getCurrent(), queryDTO.getSize()), wrapper);

        List<ContentDetailDTO> records = page.getRecords().stream()
                .map(this::toDetailDTO)
                .toList();

        return new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    public ContentStatsDTO getContentStats(String contentType) {
        ContentStatsDTO stats = new ContentStatsDTO();
        String type = StringUtils.hasText(contentType) ? contentType.trim() : null;
        long draft = countByStatus(type, "draft");
        long scheduled = countByStatus(type, "scheduled");
        long published = countByStatus(type, "published");
        long unpublished = countByStatus(type, "unpublished");
        long deleted = countByStatus(type, "deleted");
        stats.setDraft(draft);
        stats.setScheduled(scheduled);
        stats.setPublished(published);
        stats.setUnpublished(unpublished);
        stats.setDeleted(deleted);
        stats.setAll(draft + scheduled + published + unpublished);
        return stats;
    }

    private long countByStatus(String contentType, String status) {
        LambdaQueryWrapper<Content> w = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(contentType)) {
            w.eq(Content::getContentType, contentType);
        }
        w.eq(Content::getStatus, status);
        return this.count(w);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ContentDetailDTO createContent(ContentDTO dto) {
        // 校验分类是否存在
        validateCategory(dto.getCategoryId());

        Content entity = new Content();
        BeanUtils.copyProperties(dto, entity);
        entity.setTags(toJsonString(dto.getTags()));
        entity.setImages(toJsonString(dto.getImages()));
        applyAttachments(entity, dto.getAttachments());
        if (!StringUtils.hasText(entity.getContentType())) {
            entity.setContentType("article");
        }
        entity.setStatus("draft");
        entity.setViewCount(0);
        if (entity.getLikeCount() == null) {
            entity.setLikeCount(0);
        }
        if (entity.getFavoriteCount() == null) {
            entity.setFavoriteCount(0);
        }
        if (entity.getSortOrder() == null) {
            entity.setSortOrder(0);
        }
        if (entity.getIsPinned() == null) {
            entity.setIsPinned(0);
        }
        if (entity.getIsRecommended() == null) {
            entity.setIsRecommended(0);
        }
        if (!StringUtils.hasText(entity.getAuthorRole())) {
            entity.setAuthorRole("editor");
        }
        if (!StringUtils.hasText(entity.getVisibility())) {
            entity.setVisibility("public");
        }
        if (!StringUtils.hasText(entity.getAuditStatus())) {
            entity.setAuditStatus("approved");
        }
        entity.setAuditStatus(contentAuditRulesService.applyContentAuditStatus(
                entity.getAuditStatus(), entity.getTitle(), entity.getContent()));
        entity.setPlanetExclusive(Integer.valueOf(1).equals(dto.getPlanetExclusive()) ? 1 : 0);
        if (StringUtils.hasText(dto.getPlanetId())) {
            entity.setPlanetId(dto.getPlanetId().trim());
        } else if (Integer.valueOf(1).equals(entity.getPlanetExclusive())) {
            entity.setPlanetId(membershipAccessService.resolveDefaultPlanetId());
        } else {
            entity.setPlanetId(null);
        }
        if (!StringUtils.hasText(entity.getLayoutTheme())) {
            entity.setLayoutTheme("standard");
        }
        if ("note".equals(entity.getContentType()) && !StringUtils.hasText(entity.getCoverImage())
                && StringUtils.hasText(entity.getImages())) {
            List<String> imgs = parseStringList(entity.getImages());
            if (!imgs.isEmpty()) {
                entity.setCoverImage(imgs.get(0));
            }
        }
        applyMomentCover(entity);
        applyScheduleFields(entity, dto);
        this.save(entity);

        // 更新标签使用次数
        updateTagUseCount(dto.getTags(), true);

        return toDetailDTO(entity);
    }

    @Override
    public ContentDetailDTO getContentDetail(Long id) {
        Content entity = getExistingContent(id);
        return toDetailDTO(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ContentDetailDTO updateContent(Long id, ContentDTO dto) {
        Content entity = getExistingContent(id);

        // 校验分类是否存在
        validateCategory(dto.getCategoryId());

        // 获取旧标签列表，用于更新标签计数
        List<String> oldTags = parseTags(entity.getTags());

        if (dto.getTitle() != null) {
            entity.setTitle(dto.getTitle());
        }
        if (dto.getContentType() != null) {
            entity.setContentType(dto.getContentType());
        }
        if (dto.getCategoryId() != null) {
            entity.setCategoryId(dto.getCategoryId());
        }
        if (dto.getCoverImage() != null) {
            entity.setCoverImage(dto.getCoverImage());
        }
        if (dto.getVideoUrl() != null) {
            entity.setVideoUrl(dto.getVideoUrl());
        }
        if (dto.getVideoDuration() != null) {
            entity.setVideoDuration(dto.getVideoDuration());
        }
        if (dto.getImages() != null) {
            entity.setImages(toJsonString(dto.getImages()));
        }
        if (dto.getAttachments() != null) {
            applyAttachments(entity, dto.getAttachments());
        }
        if (dto.getSummary() != null) {
            entity.setSummary(dto.getSummary());
        }
        if (dto.getSeoTitle() != null) {
            entity.setSeoTitle(dto.getSeoTitle());
        }
        if (dto.getSeoDescription() != null) {
            entity.setSeoDescription(dto.getSeoDescription());
        }
        if (dto.getLayoutTheme() != null) {
            entity.setLayoutTheme(dto.getLayoutTheme());
        }
        if (dto.getDiscoverLayout() != null) {
            entity.setDiscoverLayout(dto.getDiscoverLayout());
        }
        if (dto.getScheduledAt() != null) {
            entity.setScheduledAt(parseScheduledAt(dto.getScheduledAt()));
        }
        if (dto.getContent() != null) {
            entity.setContent(dto.getContent());
        }
        if (dto.getAuthor() != null) {
            entity.setAuthor(dto.getAuthor());
        }
        if (dto.getAuthorRole() != null) {
            entity.setAuthorRole(dto.getAuthorRole());
        }
        if (dto.getVisibility() != null) {
            entity.setVisibility(dto.getVisibility());
        }
        if (dto.getAuditStatus() != null) {
            entity.setAuditStatus(dto.getAuditStatus());
        }
        if (dto.getAuthorAvatar() != null) {
            entity.setAuthorAvatar(dto.getAuthorAvatar());
        }
        if (dto.getSource() != null) {
            entity.setSource(dto.getSource());
        }
        if (dto.getTags() != null) {
            entity.setTags(toJsonString(dto.getTags()));
        }
        if (dto.getLikeCount() != null) {
            entity.setLikeCount(dto.getLikeCount());
        }
        if (dto.getFavoriteCount() != null) {
            entity.setFavoriteCount(dto.getFavoriteCount());
        }
        if (dto.getSortOrder() != null) {
            entity.setSortOrder(dto.getSortOrder());
        }
        if (dto.getIsPinned() != null) {
            entity.setIsPinned(dto.getIsPinned());
        }
        if (dto.getIsRecommended() != null) {
            entity.setIsRecommended(dto.getIsRecommended());
        }
        if (dto.getPlanetExclusive() != null) {
            entity.setPlanetExclusive(dto.getPlanetExclusive() == 1 ? 1 : 0);
        }
        if (dto.getPlanetId() != null) {
            entity.setPlanetId(StringUtils.hasText(dto.getPlanetId()) ? dto.getPlanetId().trim() : null);
        } else if (Integer.valueOf(1).equals(entity.getPlanetExclusive())
                && !StringUtils.hasText(entity.getPlanetId())) {
            entity.setPlanetId(membershipAccessService.resolveDefaultPlanetId());
        }
        if ("note".equals(entity.getContentType()) && !StringUtils.hasText(entity.getCoverImage())) {
            List<String> imgs = parseStringList(entity.getImages());
            if (!imgs.isEmpty()) {
                entity.setCoverImage(imgs.get(0));
            }
        }
        applyMomentCover(entity);
        applyScheduleFields(entity, dto);
        if (dto.getContent() != null || dto.getTitle() != null) {
            entity.setAuditStatus(contentAuditRulesService.applyContentAuditStatus(
                    entity.getAuditStatus(), entity.getTitle(), entity.getContent()));
        }
        this.updateById(entity);

        // 更新标签使用次数：旧标签-1，新标签+1
        List<String> newTags = dto.getTags() != null ? dto.getTags() : oldTags;
        updateTagUseCount(oldTags, false);
        updateTagUseCount(newTags, true);

        return toDetailDTO(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteContent(Long id) {
        Content entity = getExistingContent(id);
        if ("deleted".equals(entity.getStatus())) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        this.update(new LambdaUpdateWrapper<Content>()
                .eq(Content::getId, id)
                .set(Content::getStatus, "deleted")
                .set(Content::getDeletedAt, now)
                .set(Content::getScheduledAt, null));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void purgeContent(Long id) {
        Content entity = getExistingContent(id);
        if (!"deleted".equals(entity.getStatus())) {
            throw new BusinessException(ErrorCode.CONTENT_STATUS_ERROR, "仅回收站内容可彻底删除");
        }
        List<String> tags = parseTags(entity.getTags());
        updateTagUseCount(tags, false);
        this.removeById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ContentDetailDTO restoreContent(Long id) {
        Content entity = getExistingContent(id);
        if (!"deleted".equals(entity.getStatus())) {
            throw new BusinessException(ErrorCode.CONTENT_STATUS_ERROR, "仅回收站内容可恢复");
        }
        this.update(new LambdaUpdateWrapper<Content>()
                .eq(Content::getId, id)
                .set(Content::getStatus, "draft")
                .set(Content::getDeletedAt, null));
        entity.setStatus("draft");
        entity.setDeletedAt(null);
        return toDetailDTO(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ContentDetailDTO publishContent(Long id) {
        Content entity = getExistingContent(id);

        if ("deleted".equals(entity.getStatus())) {
            throw new BusinessException(ErrorCode.CONTENT_STATUS_ERROR, "回收站内容请先恢复再发布");
        }
        if ("published".equals(entity.getStatus())) {
            throw new BusinessException(ErrorCode.CONTENT_STATUS_ERROR, "内容已发布，不可重复发布");
        }

        LocalDateTime now = LocalDateTime.now();
        LambdaUpdateWrapper<Content> uw = new LambdaUpdateWrapper<Content>()
                .eq(Content::getId, id)
                .set(Content::getStatus, "published")
                .set(Content::getPublishedAt, now)
                .set(Content::getScheduledAt, null)
                .set(Content::getUnpublishedAt, null)
                .set(Content::getUnpublishReason, null);
        if (entity.getFirstPublishedAt() == null) {
            uw.set(Content::getFirstPublishedAt, now);
            entity.setFirstPublishedAt(now);
        }
        this.update(uw);

        entity.setStatus("published");
        entity.setPublishedAt(now);
        entity.setScheduledAt(null);
        entity.setUnpublishedAt(null);
        entity.setUnpublishReason(null);

        try {
            knowledgeSyncService.ingestPublishedContent(entity);
        } catch (Exception e) {
            log.warn("content publish auto-ingest skipped id={}: {}", id, e.getMessage());
        }

        return toDetailDTO(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ContentDetailDTO unpublishContent(Long id) {
        return unpublishContent(id, null);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ContentDetailDTO unpublishContent(Long id, String reason) {
        Content entity = getExistingContent(id);

        if (!"published".equals(entity.getStatus())) {
            throw new BusinessException(ErrorCode.CONTENT_STATUS_ERROR, "内容未发布，无法下架");
        }

        LocalDateTime now = LocalDateTime.now();
        String reasonVal = StringUtils.hasText(reason) ? reason.trim() : null;
        if (reasonVal != null && reasonVal.length() > 255) {
            reasonVal = reasonVal.substring(0, 255);
        }
        this.update(new LambdaUpdateWrapper<Content>()
                .eq(Content::getId, id)
                .set(Content::getStatus, "unpublished")
                .set(Content::getUnpublishedAt, now)
                .set(Content::getUnpublishReason, reasonVal));
        // 保留 published_at / first_published_at，不清空
        entity.setStatus("unpublished");
        entity.setUnpublishedAt(now);
        entity.setUnpublishReason(reasonVal);
        if (StringUtils.hasText(reasonVal)) {
            log.info("content unpublish id={} reason={}", id, reasonVal);
        }

        return toDetailDTO(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ContentDetailDTO scheduleContent(Long id, String scheduledAt) {
        Content entity = getExistingContent(id);
        if ("deleted".equals(entity.getStatus())) {
            throw new BusinessException(ErrorCode.CONTENT_STATUS_ERROR, "回收站内容不可定时发布");
        }
        LocalDateTime at = parseScheduledAt(scheduledAt);
        if (at == null) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "请填写定时发布时间");
        }
        if (!at.isAfter(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "定时发布时间须晚于当前时间");
        }
        this.update(new LambdaUpdateWrapper<Content>()
                .eq(Content::getId, id)
                .set(Content::getStatus, "scheduled")
                .set(Content::getScheduledAt, at));
        entity.setStatus("scheduled");
        entity.setScheduledAt(at);
        return toDetailDTO(entity);
    }

    @Override
    public PageResult<ContentDetailDTO> listPublishedContents(ContentQueryDTO queryDTO) {
        // 小程序端只查询已发布内容
        ContentQueryDTO mpQuery = new ContentQueryDTO();
        mpQuery.setCurrent(queryDTO.getCurrent());
        mpQuery.setSize(queryDTO.getSize());
        mpQuery.setKeyword(queryDTO.getKeyword());
        mpQuery.setCategoryId(queryDTO.getCategoryId());
        mpQuery.setTag(queryDTO.getTag());
        mpQuery.setContentType(queryDTO.getContentType());
        mpQuery.setAuthor(queryDTO.getAuthor());
        mpQuery.setAuthorRole(queryDTO.getAuthorRole());
        mpQuery.setSortBy(queryDTO.getSortBy());
        mpQuery.setId(queryDTO.getId());
        mpQuery.setRecommended(queryDTO.getRecommended());
        mpQuery.setStatus("published");

        String sortBy = mpQuery.getSortBy() == null ? "new" : mpQuery.getSortBy().trim().toLowerCase();
        Long listUserId = SecurityUtils.getCurrentUserId();
        boolean listMember = membershipAccessService.hasPlatformMembership(listUserId);
        if ("vip".equals(sortBy) && !listMember) {
            long cur = mpQuery.getCurrent() == null ? 1L : mpQuery.getCurrent().longValue();
            long sz = mpQuery.getSize() == null ? 10L : mpQuery.getSize().longValue();
            return new PageResult<>(Collections.emptyList(), 0L, cur, sz);
        }

        LambdaQueryWrapper<Content> wrapper = buildQueryWrapper(mpQuery);
        // 列表接口不查正文/附件大字段，避免小程序与预览拉取过慢
        wrapper.select(Content.class, info ->
                !"content".equals(info.getColumn()) && !"attachments".equals(info.getColumn()));
        // 下架可见性内容不进公开列表（详情门禁已挡）
        wrapper.and(w -> w.isNull(Content::getVisibility)
                .or()
                .ne(Content::getVisibility, "removed"));
        if ("vip".equals(sortBy)) {
            wrapper.eq(Content::getVisibility, "member_only");
        } else if (!listMember) {
            // member_only：与详情门禁一致，非会员不进公开列表（会员可见）
            wrapper.and(w -> w.isNull(Content::getVisibility)
                    .or()
                    .ne(Content::getVisibility, "member_only"));
        }
        // 星球专属走星球 feed，不进公开内容列表
        wrapper.and(w -> w.isNull(Content::getPlanetExclusive)
                .or()
                .ne(Content::getPlanetExclusive, 1));
        // 未过审内容不进公开列表（历史空值视为已通过）
        wrapper.and(w -> w.isNull(Content::getAuditStatus)
                .or()
                .notIn(Content::getAuditStatus, java.util.Arrays.asList("pending", "rejected")));
        if ("hot".equals(sortBy)) {
            wrapper.orderByDesc(Content::getViewCount);
            wrapper.orderByDesc(Content::getPublishedAt);
        } else {
            wrapper.orderByAsc(Content::getSortOrder);
            wrapper.orderByDesc(Content::getPublishedAt);
        }

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<Content> page =
                this.page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(
                        mpQuery.getCurrent(), mpQuery.getSize()), wrapper);

        List<ContentDetailDTO> records = page.getRecords().stream()
                .map(this::toListDTO)
                .toList();

        return new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ContentDetailDTO getPublishedContentDetail(Long id) {
        Content entity = this.getById(id);
        if (entity == null || !"published".equals(entity.getStatus())) {
            throw new BusinessException(ErrorCode.CONTENT_NOT_FOUND);
        }
        if ("removed".equalsIgnoreCase(entity.getVisibility())) {
            throw new BusinessException(ErrorCode.CONTENT_NOT_FOUND);
        }

        Long userId = SecurityUtils.getCurrentUserId();

        // 星球专属走星球详情门禁（浏览量由 getPublishedPlanetContentDetail 统一 +1，避免双计）
        if (Integer.valueOf(1).equals(entity.getPlanetExclusive())) {
            return getPublishedPlanetContentDetail(id, userId);
        }

        // 浏览量 +1
        entity.setViewCount((entity.getViewCount() == null ? 0 : entity.getViewCount()) + 1);
        this.updateById(entity);

        ContentDetailDTO dto = toDetailDTO(entity);

        boolean memberOnly = "member_only".equalsIgnoreCase(entity.getVisibility());
        if (memberOnly) {
            boolean unlocked = membershipAccessService.hasPlatformMembership(userId)
                    || membershipAccessService.hasBenefit(userId, MemberBenefitCodes.ARTICLE_FREE);
            applyPlanetGate(dto, unlocked, membershipAccessService.unpaidViewMode(), true);
            if (unlocked) {
                dto.setAttachments(fileEntitlementService.enrichAttachments(
                        dto.getAttachments(), userId));
            } else {
                dto.setAttachments(Collections.emptyList());
            }
            return dto;
        }

        dto.setAccessGranted(true);
        dto.setLocked(false);
        dto.setAttachments(fileEntitlementService.enrichAttachments(
                dto.getAttachments(), userId));
        return dto;
    }

    @Override
    public PageResult<ContentDetailDTO> listPublishedContentsForPlanet(ContentQueryDTO queryDTO, Long userId) {
        ContentQueryDTO q = queryDTO != null ? queryDTO : new ContentQueryDTO();
        q.setStatus("published");
        q.setContentType(StringUtils.hasText(q.getContentType()) ? q.getContentType() : "moment");
        q.setPlanetExclusive(1);

        String gatePlanetId = resolvePlanetIdForGate(q.getPlanetId());
        boolean member = membershipAccessService.hasPlanetMembership(userId, gatePlanetId);
        String mode = membershipAccessService.unpaidViewMode();
        int previewN = membershipAccessService.previewCount();

        if (!member && "hidden".equals(mode)) {
            long cur = q.getCurrent() == null ? 1L : q.getCurrent().longValue();
            long sz = q.getSize() == null ? 10L : q.getSize().longValue();
            return new PageResult<ContentDetailDTO>(Collections.emptyList(), 0L, cur, sz);
        }

        LambdaQueryWrapper<Content> wrapper = buildQueryWrapper(q);
        // 列表仍不取正文，但保留 attachments 以便展示 PDF 卡片（URL 由门禁脱敏）
        wrapper.select(Content.class, info -> !"content".equals(info.getColumn()));
        wrapper.and(w -> w.isNull(Content::getVisibility)
                .or()
                .ne(Content::getVisibility, "removed"));
        wrapper.and(w -> w.isNull(Content::getAuditStatus)
                .or()
                .notIn(Content::getAuditStatus, java.util.Arrays.asList("pending", "rejected")));
        wrapper.orderByDesc(Content::getIsPinned);
        wrapper.orderByAsc(Content::getSortOrder);
        wrapper.orderByDesc(Content::getPublishedAt);

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<Content> page =
                this.page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(
                        q.getCurrent(), q.getSize()), wrapper);

        long offset = (page.getCurrent() - 1) * page.getSize();
        List<ContentDetailDTO> records = new ArrayList<>();
        for (int i = 0; i < page.getRecords().size(); i++) {
            Content entity = page.getRecords().get(i);
            ContentDetailDTO dto = toPlanetListDTO(entity);
            boolean unlocked = member || ("preview_n".equals(mode) && (offset + i) < previewN);
            applyPlanetGate(dto, unlocked, mode, false);
            if (unlocked && dto.getAttachments() != null && !dto.getAttachments().isEmpty()) {
                String filePlanetId = StringUtils.hasText(entity.getPlanetId())
                        ? entity.getPlanetId().trim() : gatePlanetId;
                dto.setAttachments(fileEntitlementService.enrichAttachments(
                        dto.getAttachments(), userId, filePlanetId));
            }
            records.add(dto);
        }
        return new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ContentDetailDTO getPublishedPlanetContentDetail(Long id, Long userId) {
        Content entity = this.getById(id);
        if (entity == null || !"published".equals(entity.getStatus())
                || !Integer.valueOf(1).equals(entity.getPlanetExclusive())) {
            throw new BusinessException(ErrorCode.CONTENT_NOT_FOUND);
        }
        String gatePlanetId = resolvePlanetIdForGate(entity.getPlanetId());
        boolean member = membershipAccessService.hasPlanetMembership(userId, gatePlanetId);
        String mode = membershipAccessService.unpaidViewMode();
        if (!member && "hidden".equals(mode)) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED.getCode(), "开通会员后可查看星球内容");
        }

        entity.setViewCount((entity.getViewCount() == null ? 0 : entity.getViewCount()) + 1);
        this.updateById(entity);

        ContentDetailDTO dto = toDetailDTO(entity);
        boolean unlocked = member;
        if (!unlocked && "preview_n".equals(mode)) {
            // 详情页不按序号解锁，仅会员可看全文；列表 preview 仅作引流
            unlocked = false;
        }
        applyPlanetGate(dto, unlocked, mode, true);
        if (unlocked) {
            dto.setAttachments(fileEntitlementService.enrichAttachments(
                    dto.getAttachments(), userId, gatePlanetId));
        } else {
            // 详情未解锁：仍返回附件元信息（无 URL），便于展示 PDF 卡片
            if (dto.getAttachments() == null || dto.getAttachments().isEmpty()) {
                dto.setAttachments(parseAttachments(entity.getAttachments()));
            }
            dto.setAttachmentCount(entity.getAttachmentCount() == null
                    ? (dto.getAttachments() == null ? 0 : dto.getAttachments().size())
                    : entity.getAttachmentCount());
            redactAttachmentUrls(dto);
        }
        return dto;
    }

    private void applyPlanetGate(ContentDetailDTO dto, boolean unlocked, String mode, boolean detail) {
        dto.setAccessGranted(unlocked);
        dto.setLocked(!unlocked);
        if (unlocked) {
            dto.setLockedReason(null);
            return;
        }
        String wallDesc = readMemberWallDesc();
        dto.setLockedReason(StringUtils.hasText(wallDesc) ? wallDesc : "开通会员后可查看全文并下载资料");
        if ("title".equals(mode)) {
            dto.setSummary(null);
            dto.setContent(null);
            dto.setImages(Collections.emptyList());
        } else if ("summary".equals(mode) || "preview_n".equals(mode)) {
            if (detail) {
                // 详情锁定：保留试读正文（约前 1-remainPercent），供门禁卡上方展示
                dto.setContent(truncateHtmlForPreview(dto.getContent(), readMemberWallKeepRatio()));
            } else {
                dto.setContent(null);
            }
        } else {
            if (detail) {
                dto.setContent(truncateHtmlForPreview(dto.getContent(), readMemberWallKeepRatio()));
            } else {
                dto.setSummary(null);
                dto.setContent(null);
                dto.setImages(Collections.emptyList());
            }
        }
        // 保留附件卡片元信息，仅脱敏可下载 URL
        redactAttachmentUrls(dto);
    }

    private String readMemberWallDesc() {
        try {
            String raw = systemConfigService.getConfigValue("content_member_wall", "");
            if (!StringUtils.hasText(raw)) return "";
            Map<?, ?> map = objectMapper.readValue(raw, Map.class);
            Object desc = map.get("desc");
            return desc != null ? String.valueOf(desc).trim() : "";
        } catch (Exception e) {
            return "";
        }
    }

    /** 剩余 68% → 保留约前 32% */
    private double readMemberWallKeepRatio() {
        try {
            String raw = systemConfigService.getConfigValue("content_member_wall", "");
            if (!StringUtils.hasText(raw)) return 0.32;
            Map<?, ?> map = objectMapper.readValue(raw, Map.class);
            Object remain = map.get("remainPercent");
            int percent = remain == null ? 68 : Integer.parseInt(String.valueOf(remain).replaceAll("[^0-9]", ""));
            percent = Math.min(95, Math.max(5, percent));
            return Math.max(0.05, Math.min(0.9, (100.0 - percent) / 100.0));
        } catch (Exception e) {
            return 0.32;
        }
    }

    private String truncateHtmlForPreview(String html, double keepRatio) {
        if (!StringUtils.hasText(html)) return html;
        String value = html.trim();
        int target = Math.max(80, (int) Math.floor(value.length() * keepRatio));
        if (value.length() <= target) return value;
        // 优先按段落切：保留完整闭合标签块，避免截在标签中间
        String[] parts = value.split("(?i)(?=</p>|</div>|</h[1-6]>)");
        if (parts.length > 1) {
            StringBuilder sb = new StringBuilder();
            for (String part : parts) {
                if (sb.length() + part.length() > target && sb.length() > 0) break;
                sb.append(part);
            }
            String cut = sb.toString().trim();
            if (StringUtils.hasText(cut)) return cut;
        }
        int cutAt = value.lastIndexOf('<', target);
        if (cutAt > target / 2) {
            return value.substring(0, cutAt).trim();
        }
        return value.substring(0, target).trim();
    }

    private void redactAttachmentUrls(ContentDetailDTO dto) {
        if (dto.getAttachments() == null || dto.getAttachments().isEmpty()) {
            return;
        }
        for (ContentAttachmentDTO a : dto.getAttachments()) {
            if (a == null) continue;
            a.setUrl(null);
            a.setCanDownload(false);
            a.setCanRead(false);
            if (a.getCanPreview() == null) {
                a.setCanPreview(true);
            }
            if (!StringUtils.hasText(a.getPreviewText())) {
                a.setPreviewText("星球会员可看");
            }
            a.setLockedReason("开通会员后可下载资料");
        }
    }

    // ==================== 私有方法 ====================

    private Content getExistingContent(Long id) {
        Content entity = this.getById(id);
        if (entity == null) {
            throw new BusinessException(ErrorCode.CONTENT_NOT_FOUND);
        }
        return entity;
    }

    private void validateCategory(Long categoryId) {
        if (categoryId != null) {
            String name = categoryService.getCategoryName(categoryId);
            if (name == null) {
                throw new BusinessException(ErrorCode.CONTENT_CATEGORY_NOT_FOUND);
            }
        }
    }

    private LambdaQueryWrapper<Content> buildQueryWrapper(ContentQueryDTO queryDTO) {
        LambdaQueryWrapper<Content> wrapper = new LambdaQueryWrapper<>();
        wrapper.like(StringUtils.hasText(queryDTO.getKeyword()), Content::getTitle, queryDTO.getKeyword());
        wrapper.eq(queryDTO.getCategoryId() != null, Content::getCategoryId, queryDTO.getCategoryId());
        if (StringUtils.hasText(queryDTO.getStatus())) {
            wrapper.eq(Content::getStatus, queryDTO.getStatus().trim());
        } else {
            // 默认排除回收站；显式 status=deleted 时只看回收站
            wrapper.ne(Content::getStatus, "deleted");
        }
        wrapper.eq(StringUtils.hasText(queryDTO.getContentType()), Content::getContentType, queryDTO.getContentType());
        wrapper.eq(StringUtils.hasText(queryDTO.getSource()), Content::getSource, queryDTO.getSource());
        wrapper.eq(queryDTO.getPlanetExclusive() != null, Content::getPlanetExclusive, queryDTO.getPlanetExclusive());
        if (StringUtils.hasText(queryDTO.getPlanetId())) {
            String planetId = queryDTO.getPlanetId().trim();
            String defaultId = membershipAccessService.resolveDefaultPlanetId();
            if (planetId.equals(defaultId)) {
                // 历史无 planet_id 的专属动态归入默认主星球池
                wrapper.and(w -> w.eq(Content::getPlanetId, planetId)
                        .or().isNull(Content::getPlanetId)
                        .or().eq(Content::getPlanetId, ""));
            } else {
                wrapper.eq(Content::getPlanetId, planetId);
            }
        }
        wrapper.eq(StringUtils.hasText(queryDTO.getAuditStatus()), Content::getAuditStatus, queryDTO.getAuditStatus());
        wrapper.eq(StringUtils.hasText(queryDTO.getAuthorRole()), Content::getAuthorRole, queryDTO.getAuthorRole());
        wrapper.eq(StringUtils.hasText(queryDTO.getAuthor()), Content::getAuthor, queryDTO.getAuthor());
        wrapper.eq(queryDTO.getId() != null, Content::getId, queryDTO.getId());
        if (queryDTO.getRecommended() != null && queryDTO.getRecommended() != 0) {
            wrapper.eq(Content::getIsRecommended, 1);
        }

        // 标签筛选（JSON字段模糊匹配）
        if (StringUtils.hasText(queryDTO.getTag())) {
            wrapper.like(Content::getTags, queryDTO.getTag());
        }

        return wrapper;
    }

    private ContentDetailDTO toDetailDTO(Content entity) {
        ContentDetailDTO dto = new ContentDetailDTO();
        BeanUtils.copyProperties(entity, dto);
        dto.setTags(parseTags(entity.getTags()));
        dto.setImages(parseStringList(entity.getImages()));
        dto.setAttachments(parseAttachments(entity.getAttachments()));
        dto.setAttachmentCount(entity.getAttachmentCount() != null ? entity.getAttachmentCount() : dto.getAttachments().size());
        dto.setCategoryName(categoryService.getCategoryName(entity.getCategoryId()));
        dto.setExternalSource(entity.getExternalSource());
        dto.setSource(ContentSourceResolver.resolvePlatformSource(entity));
        return dto;
    }

    /** 列表场景：不含正文；星球列表保留附件摘要 */
    private ContentDetailDTO toListDTO(Content entity) {
        ContentDetailDTO dto = toDetailDTO(entity);
        dto.setContent(null);
        dto.setAttachments(null);
        return dto;
    }

    private ContentDetailDTO toPlanetListDTO(Content entity) {
        ContentDetailDTO dto = toDetailDTO(entity);
        dto.setContent(null);
        // 保留 attachments 元信息
        return dto;
    }

    private void applyAttachments(Content entity, List<ContentAttachmentDTO> attachments) {
        List<ContentAttachmentDTO> list = attachments != null ? attachments : Collections.emptyList();
        entity.setAttachments(toAttachmentsJson(list));
        entity.setAttachmentCount(list.size());
    }

    private void applyMomentCover(Content entity) {
        if (!"moment".equals(entity.getContentType()) || StringUtils.hasText(entity.getCoverImage())) {
            return;
        }
        List<String> imgs = parseStringList(entity.getImages());
        if (!imgs.isEmpty()) {
            entity.setCoverImage(imgs.get(0));
        }
    }

    private List<ContentAttachmentDTO> parseAttachments(String json) {
        if (!StringUtils.hasText(json)) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<ContentAttachmentDTO>>() {});
        } catch (JsonProcessingException e) {
            log.warn("附件 JSON 反序列化失败: {}", json, e);
            return Collections.emptyList();
        }
    }

    private String toAttachmentsJson(List<ContentAttachmentDTO> attachments) {
        if (attachments == null || attachments.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(attachments);
        } catch (JsonProcessingException e) {
            log.warn("附件序列化失败", e);
            return null;
        }
    }

    private List<String> parseStringList(String json) {
        if (!StringUtils.hasText(json)) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            log.warn("JSON 数组反序列化失败: {}", json, e);
            return Collections.emptyList();
        }
    }

    private String toJsonString(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(tags);
        } catch (JsonProcessingException e) {
            log.warn("标签序列化失败", e);
            return null;
        }
    }

    private List<String> parseTags(String tagsJson) {
        if (!StringUtils.hasText(tagsJson)) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(tagsJson, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            log.warn("标签反序列化失败: {}", tagsJson, e);
            return Collections.emptyList();
        }
    }

    private void updateTagUseCount(List<String> tags, boolean increment) {
        if (tags == null || tags.isEmpty()) {
            return;
        }
        for (String tagName : tags) {
            ContentTag tag = tagMapper.selectOne(
                    new LambdaQueryWrapper<ContentTag>().eq(ContentTag::getName, tagName));
            if (tag != null) {
                int newCount = increment ? tag.getUseCount() + 1 : Math.max(0, tag.getUseCount() - 1);
                tagMapper.update(null,
                        new LambdaUpdateWrapper<ContentTag>()
                                .eq(ContentTag::getId, tag.getId())
                                .set(ContentTag::getUseCount, newCount));
            }
        }
    }

    private void applyScheduleFields(Content entity, ContentDTO dto) {
        if (dto.getSeoTitle() != null) {
            entity.setSeoTitle(dto.getSeoTitle().isBlank() ? null : dto.getSeoTitle().trim());
        }
        if (dto.getSeoDescription() != null) {
            entity.setSeoDescription(dto.getSeoDescription().isBlank() ? null : dto.getSeoDescription().trim());
        }
        if (dto.getScheduledAt() != null) {
            String raw = dto.getScheduledAt().trim();
            LocalDateTime at = raw.isEmpty() ? null : parseScheduledAt(raw);
            entity.setScheduledAt(at);
            // 有定时 → scheduled（含从已上架改定时）；清空定时且原为 scheduled → draft
            if (!"deleted".equals(entity.getStatus())) {
                if (at != null) {
                    entity.setStatus("scheduled");
                } else if ("scheduled".equals(entity.getStatus())) {
                    entity.setStatus("draft");
                }
            }
        }
    }

    private LocalDateTime parseScheduledAt(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        String text = raw.trim().replace('T', ' ');
        if (text.length() == 16) {
            text = text + ":00";
        }
        try {
            return LocalDateTime.parse(text, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        } catch (DateTimeParseException e1) {
            try {
                return LocalDateTime.parse(raw.trim());
            } catch (DateTimeParseException e2) {
                throw new BusinessException(ErrorCode.PARAM_ERROR, "定时发布时间格式不正确");
            }
        }
    }

    /** 扫描到期定时发布内容并发布 */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public int publishDueScheduledContents() {
        LocalDateTime now = LocalDateTime.now();
        List<Content> due = this.lambdaQuery()
                .in(Content::getStatus, "scheduled", "draft")
                .isNotNull(Content::getScheduledAt)
                .le(Content::getScheduledAt, now)
                .list();
        int count = 0;
        for (Content item : due) {
            LocalDateTime firstAt = item.getFirstPublishedAt() != null ? item.getFirstPublishedAt() : now;
            this.update(new LambdaUpdateWrapper<Content>()
                    .eq(Content::getId, item.getId())
                    .set(Content::getStatus, "published")
                    .set(Content::getPublishedAt, now)
                    .set(Content::getFirstPublishedAt, firstAt)
                    .set(Content::getScheduledAt, null)
                    .set(Content::getUnpublishedAt, null));
            item.setStatus("published");
            item.setPublishedAt(now);
            item.setFirstPublishedAt(firstAt);
            item.setScheduledAt(null);
            item.setUnpublishedAt(null);
            try {
                knowledgeSyncService.ingestPublishedContent(item);
            } catch (Exception e) {
                log.warn("scheduled publish auto-ingest skipped id={}: {}", item.getId(), e.getMessage());
            }
            count++;
            log.info("定时发布内容 id={} title={}", item.getId(), item.getTitle());
        }
        return count;
    }

    private String resolvePlanetIdForGate(String planetId) {
        if (StringUtils.hasText(planetId)) {
            return planetId.trim();
        }
        return membershipAccessService.resolveDefaultPlanetId();
    }
}
