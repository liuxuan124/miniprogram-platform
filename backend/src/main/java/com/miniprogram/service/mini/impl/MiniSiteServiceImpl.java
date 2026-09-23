package com.miniprogram.service.mini.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.dto.mini.MiniContentReleaseVO;
import com.miniprogram.dto.mini.MiniPublishRequestDTO;
import com.miniprogram.dto.mini.MiniPublishResultVO;
import com.miniprogram.dto.mini.MiniRollbackPreviewVO;
import com.miniprogram.dto.mini.MiniRollbackResultVO;
import com.miniprogram.dto.mini.MiniSiteUpdateDTO;
import com.miniprogram.dto.mini.MiniSiteVO;
import com.miniprogram.dto.mini.PendingChangeVO;
import com.miniprogram.dto.mini.PendingChangesVO;
import com.miniprogram.dto.system.ConfigBatchUpdateDTO;
import com.miniprogram.dto.system.ConfigItemDTO;
import com.miniprogram.entity.MiniappRelease;
import com.miniprogram.entity.Page;
import com.miniprogram.entity.PageVersion;
import com.miniprogram.mapper.PageMapper;
import com.miniprogram.mapper.PageVersionMapper;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.MiniappReleaseService;
import com.miniprogram.service.PageService;
import com.miniprogram.service.SystemConfigService;
import com.miniprogram.service.impl.SystemConfigServiceImpl;
import com.miniprogram.service.mini.MiniSiteService;
import com.miniprogram.service.mini.PageStatusCalculator;
import com.miniprogram.service.miniapp.StoreTemplateNames;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MiniSiteServiceImpl implements MiniSiteService {

    public static final String LIVE_RELEASE_NO_KEY = "live_release_no";
    public static final String LIVE_RELEASE_AT_KEY = "live_release_at";
    public static final String PENDING_ROLLBACK_FROM_NO_KEY = "pending_rollback_from_release_no";
    public static final String PENDING_ROLLBACK_FROM_ID_KEY = "pending_rollback_from_release_id";
    public static final String LAST_PUBLISH_FINGERPRINT_KEY = "last_content_publish_fingerprint";
    public static final String LAST_PUBLISH_AT_KEY = "last_content_publish_at";

    /** 同一租户短窗口内相同指纹视为重复提交（秒） */
    private static final int PUBLISH_DEDUP_WINDOW_SECONDS = 30;

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private static final Set<String> DRAFT_FIELD_KEYS = Set.of(
            "miniappTemplateKey", "miniappHomePageId", "miniappMinePageId",
            "tabbarItems", "minePageConfig", "miniappThemeConfig",
            "miniappShareTitle", "miniappShareImage",
            "miniappBrandConfig", "site_name", "site_logo"
    );

    /** 租户级发布互斥，防止脚本/连点并发刷出版本 */
    private static final ConcurrentHashMap<Long, Object> PUBLISH_LOCKS = new ConcurrentHashMap<>();

    private final SystemConfigService systemConfigService;
    private final MiniappReleaseService miniappReleaseService;
    private final PageService pageService;
    private final PageMapper pageMapper;
    private final PageVersionMapper pageVersionMapper;
    private final ObjectMapper objectMapper;

    @Override
    public MiniSiteVO getSite(String view) {
        boolean useDraft = !"live".equalsIgnoreCase(view);
        Map<String, String> live = loadLiveConfigMap();
        Map<String, Object> draft = readDraftMap();
        Map<String, String> effective = new HashMap<>(live);
        if (useDraft && !draft.isEmpty()) {
            mergeDraftInto(effective, draft);
        }

        MiniSiteVO vo = new MiniSiteVO();
        fillBrand(vo, effective);
        fillTemplate(vo);
        vo.setTheme(parseJsonObject(effective.get("miniappThemeConfig")));
        vo.setTabBar(parseTabItems(effective.get("tabbarItems")));
        vo.setLiveReleaseNo(parseIntOrDefault(systemConfigService.getConfigValue(LIVE_RELEASE_NO_KEY), 0));
        // 顶部时间与发布记录统一：优先用当前序号对应记录的 published_at
        MiniappRelease liveRelease = findContentReleaseByNo(vo.getLiveReleaseNo());
        LocalDateTime liveAt = liveRelease != null ? liveRelease.getPublishedAt() : null;
        if (liveAt == null) {
            liveAt = parseDateTime(systemConfigService.getConfigValue(LIVE_RELEASE_AT_KEY));
        }
        vo.setLiveReleaseAt(liveAt);
        if (liveRelease != null && StringUtils.hasText(liveRelease.getPublisherName())) {
            vo.setLivePublisherName(liveRelease.getPublisherName());
        }
        vo.setMiniappHomePageId(parseLongOrNull(effective.get("miniappHomePageId")));
        vo.setWechatCodeVersion(systemConfigService.getConfigValue("wx_last_pushed_version"));
        vo.setPendingCount(listPendingChanges().getTotal());
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MiniSiteVO updateSiteDraft(MiniSiteUpdateDTO dto) {
        Map<String, Object> draft = new LinkedHashMap<>(readDraftMap());
        Map<String, String> live = loadLiveConfigMap();

        if (dto.getTabBar() != null) {
            draft.put("tabbarItems", dto.getTabBar());
            // 同步首页 ID：以底部导航第 1 项为准，避免预览仍指向历史壳页
            Object first = dto.getTabBar().isEmpty() ? null : dto.getTabBar().get(0);
            if (first instanceof Map<?, ?> tab0) {
                Object pageId = tab0.get("pageId");
                if (pageId != null && StringUtils.hasText(String.valueOf(pageId))) {
                    draft.put("miniappHomePageId", String.valueOf(pageId));
                }
            }
        }
        if (dto.getTheme() != null) {
            draft.put("miniappThemeConfig", dto.getTheme());
        }
        if (dto.getMinePageConfig() != null) {
            draft.put("minePageConfig", dto.getMinePageConfig());
        }
        if (dto.getHomePageId() != null) {
            draft.put("miniappHomePageId", String.valueOf(dto.getHomePageId()));
        }
        if (dto.getMinePageId() != null) {
            draft.put("miniappMinePageId", String.valueOf(dto.getMinePageId()));
        }
        if (dto.getTemplateKey() != null) {
            draft.put("miniappTemplateKey", dto.getTemplateKey());
        }
        if (dto.getShareTitle() != null) {
            draft.put("miniappShareTitle", dto.getShareTitle());
        }
        if (dto.getShareImage() != null) {
            draft.put("miniappShareImage", dto.getShareImage());
        }

        Map<String, Object> brand = readBrandMap(live, draft);
        boolean brandTouched = false;
        if (dto.getBrandConfig() != null && !dto.getBrandConfig().isEmpty()) {
            brand.putAll(dto.getBrandConfig());
            brandTouched = true;
        }
        if (dto.getName() != null) {
            brand.put("appName", dto.getName());
            brandTouched = true;
        }
        if (dto.getSlogan() != null) {
            brand.put("loginTagline", dto.getSlogan());
            brand.put("slogan", dto.getSlogan());
            brandTouched = true;
        }
        if (brandTouched) {
            draft.put("miniappBrandConfig", brand);
            Object appName = brand.get("appName");
            if (appName != null) {
                draft.put("site_name", String.valueOf(appName));
            }
            Object logo = brand.get("logoUrl");
            if (logo != null) {
                draft.put("site_logo", String.valueOf(logo));
            }
        }

        // 只保留允许提升的键
        Map<String, Object> cleaned = new LinkedHashMap<>();
        for (Map.Entry<String, Object> e : draft.entrySet()) {
            if (DRAFT_FIELD_KEYS.contains(e.getKey())) {
                cleaned.put(e.getKey(), e.getValue());
            }
        }

        String json;
        try {
            json = objectMapper.writeValueAsString(cleaned);
        } catch (Exception e) {
            throw new IllegalStateException("序列化站点草稿失败", e);
        }

        ConfigItemDTO item = new ConfigItemDTO();
        item.setConfigKey(SystemConfigServiceImpl.SITE_BUILDER_DRAFT_KEY);
        item.setConfigValue(json);
        item.setConfigGroup("basic");
        item.setDescription("品牌导航待上线草稿");
        ConfigBatchUpdateDTO batch = new ConfigBatchUpdateDTO();
        batch.setConfigs(List.of(item));
        systemConfigService.batchUpdateConfigs(batch);

        return getSite("draft");
    }

    @Override
    public PendingChangesVO listPendingChanges() {
        PendingChangesVO vo = new PendingChangesVO();
        Map<String, Object> draft = readDraftMap();
        List<PendingChangeVO> items = new ArrayList<>();

        if (!draft.isEmpty()) {
            vo.setSiteDraftChanged(true);
            PendingChangeVO site = new PendingChangeVO();
            site.setType("site");
            site.setName("站点配置");
            site.setStatus("pending");
            site.setSummary("导航/主题/品牌等有未上线改动");
            site.setChangedKeys(new ArrayList<>(draft.keySet()));
            items.add(site);
        }

        Map<String, String> effective = new HashMap<>(loadLiveConfigMap());
        mergeDraftInto(effective, draft);
        Set<Long> boundIds = collectBoundPageIds(effective);

        List<Page> pages = pageMapper.selectList(new LambdaQueryWrapper<Page>()
                .orderByDesc(Page::getUpdateTime));
        Map<Long, Integer> latestByPage = loadLatestVersions(
                pages.stream().map(Page::getId).collect(Collectors.toList()));

        for (Page page : pages) {
            if (page.getArchived() != null && page.getArchived() == 1) {
                continue;
            }
            int latest = latestByPage.getOrDefault(page.getId(), 0);
            String status = PageStatusCalculator.calculate(
                    page.getStatus(), page.getCurrentVersion(), latest, page.getArchived());
            boolean dirty = "pending".equals(status)
                    || ("draft".equals(status) && latest > 0 && boundIds.contains(page.getId()));
            if (!dirty) {
                continue;
            }
            PendingChangeVO item = new PendingChangeVO();
            item.setType("page");
            item.setPageId(page.getId());
            item.setName(page.getName());
            item.setPath(page.getPath());
            item.setStatus(status);
            item.setSummary("pending".equals(status) ? "已上线页面有未发布改动" : "绑定页尚未首次上线");
            items.add(item);
        }

        vo.setItems(items);
        vo.setTotal(items.size());
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MiniPublishResultVO publish(MiniPublishRequestDTO request) {
        Long tenantId = SecurityUtils.getCurrentTenantId() != null ? SecurityUtils.getCurrentTenantId() : 0L;
        Object lock = PUBLISH_LOCKS.computeIfAbsent(tenantId, id -> new Object());
        synchronized (lock) {
            return doPublishLocked(request);
        }
    }

    private MiniPublishResultVO doPublishLocked(MiniPublishRequestDTO request) {
        boolean includeSite = request == null || request.getIncludeSite() == null || Boolean.TRUE.equals(request.getIncludeSite());
        List<Long> pageIds = request != null && request.getPageIds() != null
                ? request.getPageIds().stream().filter(Objects::nonNull).distinct().collect(Collectors.toList())
                : null;

        PendingChangesVO pendingBefore = listPendingChanges();
        String fingerprint = buildPublishFingerprint(includeSite, pageIds, pendingBefore, request != null ? request.getClientRequestId() : null);
        assertNotDuplicatePublish(fingerprint);

        boolean promoted = false;
        if (includeSite) {
            promoted = systemConfigService.promoteSiteBuilderDraft();
        }

        long publishedPages = 0;
        List<String> warnings = new ArrayList<>();
        List<String> publishedPageNames = new ArrayList<>();
        if (pageIds != null && !pageIds.isEmpty()) {
            for (Long id : pageIds) {
                try {
                    Page page = pageMapper.selectById(id);
                    pageService.publishPage(id);
                    publishedPages++;
                    if (page != null && StringUtils.hasText(page.getName())) {
                        publishedPageNames.add(page.getName());
                    } else {
                        publishedPageNames.add("页面#" + id);
                    }
                } catch (Exception e) {
                    warnings.add("页面 #" + id + "：" + e.getMessage());
                    log.warn("选择性发布页面失败 id={}: {}", id, e.getMessage());
                }
            }
        } else if (pageIds == null) {
            // 未传 pageIds = 发布全部脏页（原行为）
            Map<String, Object> publishResult = miniappReleaseService.publishContentToMiniapp();
            Object pages = publishResult.get("publishedPages");
            if (pages instanceof Number n) {
                publishedPages = n.longValue();
            }
            Object w = publishResult.get("warnings");
            if (w instanceof List<?> list) {
                for (Object item : list) {
                    if (item != null) {
                        warnings.add(String.valueOf(item));
                    }
                }
            }
            for (PendingChangeVO item : pendingBefore.getItems() != null ? pendingBefore.getItems() : List.<PendingChangeVO>of()) {
                if (item != null && !"site".equals(item.getType()) && StringUtils.hasText(item.getName())) {
                    publishedPageNames.add(item.getName());
                }
            }
        }
        // pageIds 空列表 = 本次不发任何页（仅可能发站点）
        if (!promoted && publishedPages <= 0) {
            throw new BusinessException(100101, "没有可发布的改动：请先改页面或站点配置，再发布");
        }

        int pendingRollbackFrom = parseIntOrDefault(systemConfigService.getConfigValue(PENDING_ROLLBACK_FROM_NO_KEY), 0);

        int prev = parseIntOrDefault(systemConfigService.getConfigValue(LIVE_RELEASE_NO_KEY), 0);
        int next = prev + 1;
        // 统一秒级时间，避免配置串与 DATETIME 差 1 秒
        LocalDateTime now = LocalDateTime.now().withNano(0);
        String at = now.format(DT_FMT);
        String publisherName = resolvePublisherName();
        String notes = buildReleaseNotes(request != null ? request.getNotes() : null,
                next, pendingRollbackFrom, promoted, publishedPageNames, pendingBefore, publisherName);

        List<ConfigItemDTO> releaseConfigs = new ArrayList<>();
        releaseConfigs.add(configItem(LIVE_RELEASE_NO_KEY, String.valueOf(next), "内容发布序号（第 N 次）"));
        releaseConfigs.add(configItem(LIVE_RELEASE_AT_KEY, at, "最近一次内容发布时间"));
        releaseConfigs.add(configItem(LAST_PUBLISH_FINGERPRINT_KEY, fingerprint, "最近一次发布指纹（防重复）"));
        releaseConfigs.add(configItem(LAST_PUBLISH_AT_KEY, at, "最近一次发布时刻（防重复）"));
        if (pendingRollbackFrom > 0) {
            releaseConfigs.add(configItem(PENDING_ROLLBACK_FROM_NO_KEY, "", "已消费的回滚来源序号"));
            releaseConfigs.add(configItem(PENDING_ROLLBACK_FROM_ID_KEY, "", "已消费的回滚来源记录"));
        }
        ConfigBatchUpdateDTO batch = new ConfigBatchUpdateDTO();
        batch.setConfigs(releaseConfigs);
        systemConfigService.batchUpdateConfigs(batch);

        Long releaseId = null;
        try {
            String semver = "c.0." + next;
            long dup = miniappReleaseService.lambdaQuery().eq(MiniappRelease::getSemver, semver).count();
            if (dup > 0) {
                semver = "c.0." + next + "." + System.currentTimeMillis() % 100000;
            }
            MiniappRelease record = new MiniappRelease();
            record.setSemver(semver);
            record.setMajor(0);
            record.setMinor(0);
            record.setPatch(next);
            record.setChangeType("content");
            record.setReleaseNotes(notes);
            record.setMode("content");
            record.setStatus(0);
            record.setIsCurrent(0);
            record.setIsSystem(0);
            record.setPageCount((int) publishedPages);
            record.setPublishedAt(now);
            record.setPublisherId(SecurityUtils.getCurrentUserId());
            record.setPublisherName(publisherName);
            if (pendingRollbackFrom > 0) {
                // 新记录：rolled_back_from = 回滚所依据的历史序号（不是「被回滚走」）
                record.setRolledBackFrom(String.valueOf(pendingRollbackFrom));
            }
            try {
                record.setSnapshot(miniappReleaseService.captureContentSnapshot());
            } catch (Exception snapEx) {
                log.warn("内容发布快照写入失败（记录仍保存）: {}", snapEx.getMessage());
            }
            miniappReleaseService.save(record);
            releaseId = record.getId();

            // 标记被本次回滚替代的「原线上」版本
            if (pendingRollbackFrom > 0 && prev > 0 && prev != pendingRollbackFrom) {
                MiniappRelease prevLive = miniappReleaseService.lambdaQuery()
                        .eq(MiniappRelease::getPatch, prev)
                        .and(w -> w.eq(MiniappRelease::getMode, "content")
                                .or()
                                .eq(MiniappRelease::getChangeType, "content"))
                        .orderByDesc(MiniappRelease::getId)
                        .last("LIMIT 1")
                        .one();
                if (prevLive != null) {
                    prevLive.setRolledBackAt(now);
                    prevLive.setRolledBackBy(SecurityUtils.getCurrentUserId());
                    prevLive.setRolledBackFrom("c.0." + next);
                    miniappReleaseService.updateById(prevLive);
                }
            }
        } catch (Exception e) {
            log.warn("写入内容发布记录失败（序号已递增）: {}", e.getMessage());
        }

        MiniPublishResultVO vo = new MiniPublishResultVO();
        vo.setSiteConfigPromoted(promoted);
        vo.setLiveReleaseNo(next);
        vo.setLiveReleaseAt(now);
        vo.setPublishedPages(publishedPages);
        vo.getWarnings().addAll(warnings);
        vo.setReleaseId(releaseId);
        vo.setMessage(pendingRollbackFrom > 0
                ? ("已发布第 " + next + " 次 · 回滚至第 " + pendingRollbackFrom + " 次")
                : ("已发布第 " + next + " 次"));
        return vo;
    }

    @Override
    public List<MiniContentReleaseVO> listContentReleases() {
        int liveNo = parseIntOrDefault(systemConfigService.getConfigValue(LIVE_RELEASE_NO_KEY), 0);
        List<MiniappRelease> rows = miniappReleaseService.lambdaQuery()
                .and(w -> w.eq(MiniappRelease::getMode, "content")
                        .or()
                        .eq(MiniappRelease::getChangeType, "content"))
                .orderByDesc(MiniappRelease::getPublishedAt)
                .orderByDesc(MiniappRelease::getId)
                .last("LIMIT 50")
                .list();
        List<MiniContentReleaseVO> list = new ArrayList<>();
        for (MiniappRelease r : rows) {
            MiniContentReleaseVO item = new MiniContentReleaseVO();
            item.setId(r.getId());
            item.setReleaseNo(r.getPatch() != null ? r.getPatch() : 0);
            item.setNote(displayReleaseNote(r));
            item.setPublishedAt(r.getPublishedAt());
            item.setPublisherId(r.getPublisherId());
            item.setPublisherName(r.getPublisherName());
            item.setPageCount(r.getPageCount());
            item.setHasSnapshot(StringUtils.hasText(r.getSnapshot()));
            item.setCurrentLive(liveNo > 0 && Objects.equals(liveNo, item.getReleaseNo()));
            Integer rollbackTo = parseRollbackToNo(r);
            item.setRollback(rollbackTo != null);
            item.setRollbackToReleaseNo(rollbackTo);
            list.add(item);
        }
        return list;
    }

    @Override
    public MiniRollbackPreviewVO previewRollback(Long releaseId) {
        if (releaseId == null) {
            throw new IllegalArgumentException("releaseId 不能为空");
        }
        MiniappRelease target = miniappReleaseService.getById(releaseId);
        if (target == null) {
            throw new IllegalArgumentException("发布记录不存在");
        }
        if (!"content".equals(target.getMode()) && !"content".equals(target.getChangeType())) {
            throw new IllegalArgumentException("只能回滚内容发布记录");
        }
        MiniRollbackPreviewVO vo = new MiniRollbackPreviewVO();
        vo.setFromReleaseNo(target.getPatch());
        vo.setHasSnapshot(StringUtils.hasText(target.getSnapshot()));
        PendingChangesVO pending = listPendingChanges();
        vo.setCurrentPendingCount(pending.getTotal());
        if (pending.getItems() != null) {
            for (PendingChangeVO item : pending.getItems()) {
                if (item == null) continue;
                String label = "site".equals(item.getType())
                        ? "站点 / 导航"
                        : (StringUtils.hasText(item.getName()) ? item.getName() : "页面");
                if (StringUtils.hasText(item.getSummary())) {
                    label = label + " · " + item.getSummary();
                }
                vo.getCurrentPendingSummaries().add(label);
            }
        }
        if (!vo.isHasSnapshot()) {
            return vo;
        }
        try {
            Map<String, Object> snapshotMap = objectMapper.readValue(target.getSnapshot(), new TypeReference<>() {});
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> pages = (List<Map<String, Object>>) snapshotMap.get("pages");
            if (pages != null) {
                for (Map<String, Object> pageData : pages) {
                    String name = Objects.toString(pageData.get("name"), "");
                    String path = Objects.toString(pageData.get("path"), "");
                    if (StringUtils.hasText(name)) {
                        vo.getRestorePageNames().add(name);
                    } else if (StringUtils.hasText(path)) {
                        vo.getRestorePageNames().add(path);
                    }
                }
            }
            Object systemConfig = snapshotMap.get("systemConfig");
            vo.setHasSiteConfig(systemConfig instanceof Map<?, ?> m && !m.isEmpty());
        } catch (Exception e) {
            log.warn("解析回滚预览快照失败: {}", e.getMessage());
        }
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MiniRollbackResultVO prepareRollback(Long releaseId) {
        if (releaseId == null) {
            throw new IllegalArgumentException("releaseId 不能为空");
        }
        MiniappRelease target = miniappReleaseService.getById(releaseId);
        if (target == null) {
            throw new IllegalArgumentException("发布记录不存在");
        }
        if (!"content".equals(target.getMode()) && !"content".equals(target.getChangeType())) {
            throw new IllegalArgumentException("只能回滚内容发布记录");
        }
        MiniRollbackPreviewVO preview = previewRollback(releaseId);
        Map<String, Object> restored = miniappReleaseService.restoreSnapshotAsPendingDraft(target.getSnapshot());

        // 标记：下次发布将记为回滚至本序号
        int fromNo = target.getPatch() != null ? target.getPatch() : 0;
        List<ConfigItemDTO> markers = new ArrayList<>();
        markers.add(configItem(PENDING_ROLLBACK_FROM_NO_KEY, String.valueOf(fromNo), "待确认回滚来源序号"));
        markers.add(configItem(PENDING_ROLLBACK_FROM_ID_KEY, String.valueOf(releaseId), "待确认回滚来源记录 ID"));
        ConfigBatchUpdateDTO batch = new ConfigBatchUpdateDTO();
        batch.setConfigs(markers);
        systemConfigService.batchUpdateConfigs(batch);

        MiniRollbackResultVO vo = new MiniRollbackResultVO();
        Object pages = restored.get("pagesRestored");
        if (pages instanceof Number n) {
            vo.setPagesRestored(n.intValue());
        }
        vo.setSiteDraftUpdated(Boolean.TRUE.equals(restored.get("siteDraftUpdated")));
        vo.setFromReleaseNo(fromNo);
        vo.setRestorePageNames(preview.getRestorePageNames());
        vo.setMessage("已还原为待发布。再到本页点「发布」后才会改线上，并记为「回滚至第 " + fromNo + " 次」");
        return vo;
    }

    private void fillBrand(MiniSiteVO vo, Map<String, String> effective) {
        Map<String, Object> brand = parseJsonMap(effective.get("miniappBrandConfig"));
        String name = firstText(
                brand.get("appName"),
                effective.get("site_name"),
                "我的小程序");
        String slogan = firstText(
                brand.get("slogan"),
                brand.get("loginTagline"),
                "");
        vo.setName(name);
        vo.setSlogan(slogan);
    }

    private void fillTemplate(MiniSiteVO vo) {
        MiniappRelease current = miniappReleaseService.lambdaQuery()
                .eq(MiniappRelease::getIsCurrent, 1)
                .last("LIMIT 1")
                .one();
        if (current == null) {
            vo.setTemplateId(null);
            vo.setTemplateName(null);
            return;
        }
        vo.setTemplateId(current.getId());
        vo.setTemplateName(StoreTemplateNames.display(
                current.getTemplateName(), current.getSemver(), current.getReleaseNotes()));
    }

    private Map<String, String> loadLiveConfigMap() {
        Map<String, String> map = new HashMap<>();
        systemConfigService.list().forEach(c -> {
            if (c.getConfigKey() != null) {
                map.put(c.getConfigKey(), c.getConfigValue());
            }
        });
        return map;
    }

    private Map<String, Object> readDraftMap() {
        String raw = systemConfigService.getConfigValue(SystemConfigServiceImpl.SITE_BUILDER_DRAFT_KEY);
        if (!StringUtils.hasText(raw) || "{}".equals(raw.trim())) {
            return new LinkedHashMap<>();
        }
        try {
            Map<String, Object> draft = objectMapper.readValue(raw, new TypeReference<>() {});
            if (draft == null || draft.isEmpty()) {
                return new LinkedHashMap<>();
            }
            return new LinkedHashMap<>(draft);
        } catch (Exception e) {
            log.warn("解析 site_builder_draft 失败: {}", e.getMessage());
            return new LinkedHashMap<>();
        }
    }

    private void mergeDraftInto(Map<String, String> target, Map<String, Object> draft) {
        for (Map.Entry<String, Object> e : draft.entrySet()) {
            Object val = e.getValue();
            if (val == null) {
                target.put(e.getKey(), "");
            } else if (val instanceof String s) {
                target.put(e.getKey(), s);
            } else {
                try {
                    target.put(e.getKey(), objectMapper.writeValueAsString(val));
                } catch (Exception ex) {
                    target.put(e.getKey(), String.valueOf(val));
                }
            }
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> readBrandMap(Map<String, String> live, Map<String, Object> draft) {
        Object fromDraft = draft.get("miniappBrandConfig");
        if (fromDraft instanceof Map<?, ?> m) {
            return new LinkedHashMap<>((Map<String, Object>) m);
        }
        if (fromDraft instanceof String s && StringUtils.hasText(s)) {
            Map<String, Object> parsed = parseJsonMap(s);
            if (!parsed.isEmpty()) {
                return parsed;
            }
        }
        Map<String, Object> fromLive = parseJsonMap(live.get("miniappBrandConfig"));
        if (!fromLive.isEmpty()) {
            return fromLive;
        }
        Map<String, Object> brand = new LinkedHashMap<>();
        if (StringUtils.hasText(live.get("site_name"))) {
            brand.put("appName", live.get("site_name"));
        }
        if (StringUtils.hasText(live.get("site_logo"))) {
            brand.put("logoUrl", live.get("site_logo"));
        }
        return brand;
    }

    private Set<Long> collectBoundPageIds(Map<String, String> configs) {
        Set<Long> ids = new LinkedHashSet<>();
        Long homeId = parseLongId(configs.get("miniappHomePageId"));
        if (homeId != null) {
            ids.add(homeId);
        }
        Long mineId = parseLongId(configs.get("miniappMinePageId"));
        if (mineId != null) {
            ids.add(mineId);
        }
        for (Map<String, Object> tab : parseTabItems(configs.get("tabbarItems"))) {
            Long pageId = parseLongId(tab.get("pageId"));
            if (pageId != null) {
                ids.add(pageId);
            }
        }
        return ids;
    }

    private Map<Long, Integer> loadLatestVersions(List<Long> pageIds) {
        Map<Long, Integer> result = new HashMap<>();
        if (pageIds == null || pageIds.isEmpty()) {
            return result;
        }
        List<PageVersion> versions = pageVersionMapper.selectList(new LambdaQueryWrapper<PageVersion>()
                .in(PageVersion::getPageId, pageIds)
                .select(PageVersion::getPageId, PageVersion::getVersion)
                .orderByDesc(PageVersion::getVersion));
        for (PageVersion v : versions) {
            result.putIfAbsent(v.getPageId(), v.getVersion());
        }
        return result;
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
                        tabs.add(new LinkedHashMap<>((Map<String, Object>) map));
                    }
                }
                return tabs;
            }
        } catch (Exception e) {
            log.warn("解析 tabbarItems 失败: {}", e.getMessage());
        }
        return List.of();
    }

    private Object parseJsonObject(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        try {
            return objectMapper.readValue(raw, Object.class);
        } catch (Exception e) {
            return raw;
        }
    }

    private Map<String, Object> parseJsonMap(String raw) {
        if (!StringUtils.hasText(raw)) {
            return new LinkedHashMap<>();
        }
        try {
            Map<String, Object> map = objectMapper.readValue(raw, new TypeReference<>() {});
            return map != null ? new LinkedHashMap<>(map) : new LinkedHashMap<>();
        } catch (Exception e) {
            return new LinkedHashMap<>();
        }
    }

    private ConfigItemDTO configItem(String key, String value, String desc) {
        ConfigItemDTO item = new ConfigItemDTO();
        item.setConfigKey(key);
        item.setConfigValue(value);
        item.setConfigGroup("mini");
        item.setDescription(desc);
        return item;
    }

    private static Long parseLongId(Object raw) {
        if (raw == null) {
            return null;
        }
        if (raw instanceof Number n) {
            return n.longValue();
        }
        String s = String.valueOf(raw).trim();
        if (!StringUtils.hasText(s)) {
            return null;
        }
        try {
            return Long.parseLong(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static int parseIntOrDefault(String raw, int def) {
        if (!StringUtils.hasText(raw)) {
            return def;
        }
        try {
            return Integer.parseInt(raw.trim());
        } catch (NumberFormatException e) {
            return def;
        }
    }

    private static LocalDateTime parseDateTime(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        try {
            return LocalDateTime.parse(raw.trim(), DT_FMT);
        } catch (Exception e) {
            try {
                return LocalDateTime.parse(raw.trim());
            } catch (Exception ignored) {
                return null;
            }
        }
    }

    private static String firstText(Object... values) {
        for (Object v : values) {
            if (v == null) {
                continue;
            }
            String s = String.valueOf(v).trim();
            if (!s.isEmpty() && !"null".equals(s)) {
                return s;
            }
        }
        return "";
    }

    private MiniappRelease findContentReleaseByNo(Integer releaseNo) {
        if (releaseNo == null || releaseNo <= 0) {
            return null;
        }
        return miniappReleaseService.lambdaQuery()
                .eq(MiniappRelease::getPatch, releaseNo)
                .and(w -> w.eq(MiniappRelease::getMode, "content")
                        .or()
                        .eq(MiniappRelease::getChangeType, "content"))
                .orderByDesc(MiniappRelease::getPublishedAt)
                .orderByDesc(MiniappRelease::getId)
                .last("LIMIT 1")
                .one();
    }

    private Long parseLongOrNull(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        try {
            long v = Long.parseLong(raw.trim());
            return v > 0 ? v : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private void assertNotDuplicatePublish(String fingerprint) {
        String lastFp = systemConfigService.getConfigValue(LAST_PUBLISH_FINGERPRINT_KEY);
        LocalDateTime lastAt = parseDateTime(systemConfigService.getConfigValue(LAST_PUBLISH_AT_KEY));
        if (!StringUtils.hasText(fingerprint) || !StringUtils.hasText(lastFp) || lastAt == null) {
            return;
        }
        if (!fingerprint.equals(lastFp)) {
            return;
        }
        long gap = Duration.between(lastAt, LocalDateTime.now().withNano(0)).getSeconds();
        if (gap >= 0 && gap < PUBLISH_DEDUP_WINDOW_SECONDS) {
            throw new BusinessException(100102,
                    "发布过于频繁：与 " + gap + " 秒前是同一批改动，请勿重复提交（" + PUBLISH_DEDUP_WINDOW_SECONDS + " 秒内）");
        }
    }

    private String buildPublishFingerprint(boolean includeSite, List<Long> pageIds,
                                          PendingChangesVO pending, String clientRequestId) {
        StringBuilder sb = new StringBuilder();
        if (StringUtils.hasText(clientRequestId)) {
            sb.append("cid=").append(clientRequestId.trim()).append('|');
        }
        sb.append("site=").append(includeSite).append('|');
        if (pageIds == null) {
            sb.append("pages=ALL|");
        } else {
            sb.append("pages=");
            pageIds.stream().filter(Objects::nonNull).sorted().forEach(id -> sb.append(id).append(','));
            sb.append('|');
        }
        if (pending != null && pending.getItems() != null) {
            pending.getItems().stream()
                    .filter(Objects::nonNull)
                    .sorted(Comparator.comparing(i -> String.valueOf(i.getPageId()) + "|" + i.getType() + "|" + i.getName()))
                    .forEach(i -> sb.append(i.getType()).append(':')
                            .append(i.getPageId()).append(':')
                            .append(i.getName()).append(':')
                            .append(i.getSummary()).append(';'));
        }
        sb.append("|rb=").append(systemConfigService.getConfigValue(PENDING_ROLLBACK_FROM_NO_KEY));
        return sha256Hex(sb.toString());
    }

    private static String sha256Hex(String raw) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] dig = md.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(dig);
        } catch (Exception e) {
            return Integer.toHexString(raw.hashCode());
        }
    }

    private String buildReleaseNotes(String userNotes, int next, int rollbackFrom,
                                     boolean promoted, List<String> pageNames,
                                     PendingChangesVO pending, String publisherName) {
        if (rollbackFrom > 0) {
            String base = "第 " + next + " 次 · 回滚至第 " + rollbackFrom + " 次";
            if (StringUtils.hasText(userNotes)) {
                base = base + " · " + userNotes.trim();
            }
            if (StringUtils.hasText(publisherName)) {
                base = base + " · 操作人：" + publisherName;
            }
            return base;
        }
        if (StringUtils.hasText(userNotes) && !userNotes.contains("releaseNo=")) {
            String base = userNotes.trim();
            if (StringUtils.hasText(publisherName) && !base.contains("操作人")) {
                base = base + " · 操作人：" + publisherName;
            }
            return base;
        }

        List<String> parts = new ArrayList<>();
        if (promoted) {
            // 站点草稿变更键
            boolean siteNamed = false;
            if (pending != null && pending.getItems() != null) {
                for (PendingChangeVO item : pending.getItems()) {
                    if (item != null && "site".equals(item.getType())) {
                        String detail = StringUtils.hasText(item.getSummary()) ? item.getSummary() : "站点 / 导航";
                        parts.add(detail);
                        siteNamed = true;
                        break;
                    }
                }
            }
            if (!siteNamed) {
                parts.add("站点 / 导航");
            }
        }
        if (pageNames != null) {
            for (String name : pageNames) {
                if (StringUtils.hasText(name) && !parts.contains(name)) {
                    parts.add(name);
                }
            }
        }
        if (parts.isEmpty() && pending != null && pending.getItems() != null) {
            for (PendingChangeVO item : pending.getItems()) {
                if (item == null) continue;
                String label = "site".equals(item.getType()) ? "站点 / 导航" : item.getName();
                if (StringUtils.hasText(label) && !parts.contains(label)) {
                    parts.add(label);
                }
            }
        }
        StringBuilder sb = new StringBuilder();
        if (parts.isEmpty()) {
            sb.append("第 ").append(next).append(" 次内容发布");
        } else {
            sb.append("改动 ").append(parts.size()).append(" 项：");
            sb.append(String.join("、", parts.stream().limit(5).toList()));
            if (parts.size() > 5) {
                sb.append(" 等");
            }
        }
        if (StringUtils.hasText(publisherName)) {
            sb.append(" · 操作人：").append(publisherName);
        }
        return sb.toString();
    }

    private String displayReleaseNote(MiniappRelease r) {
        String raw = r.getReleaseNotes();
        if (!StringUtils.hasText(raw)) {
            return "第 " + (r.getPatch() != null ? r.getPatch() : "?") + " 次内容发布";
        }
        // 历史脏文案：去掉 releaseNo=N
        String cleaned = raw.replaceAll("\\s*\\(releaseNo=\\d+\\)", "").trim();
        Integer rb = parseRollbackToNo(r);
        if (rb != null && !cleaned.contains("回滚")) {
            return "第 " + r.getPatch() + " 次 · 回滚至第 " + rb + " 次";
        }
        return cleaned;
    }

    private Integer parseRollbackToNo(MiniappRelease r) {
        if (r == null) return null;
        String notes = r.getReleaseNotes();
        if (StringUtils.hasText(notes)) {
            java.util.regex.Matcher m = java.util.regex.Pattern
                    .compile("回滚至第\\s*(\\d+)\\s*次")
                    .matcher(notes);
            if (m.find()) {
                return Integer.parseInt(m.group(1));
            }
        }
        if (StringUtils.hasText(r.getRolledBackFrom())) {
            String from = r.getRolledBackFrom().trim();
            // 存的是目标序号或 semver
            if (from.matches("\\d+")) {
                return Integer.parseInt(from);
            }
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("c\\.0\\.(\\d+)").matcher(from);
            if (m.find()) {
                return Integer.parseInt(m.group(1));
            }
        }
        return null;
    }

    private String resolvePublisherName() {
        try {
            Authentication authentication = SecurityUtils.getAuthentication();
            if (authentication != null && authentication.isAuthenticated()
                    && !"anonymousUser".equals(String.valueOf(authentication.getPrincipal()))) {
                String name = authentication.getName();
                if (StringUtils.hasText(name) && !"anonymousUser".equals(name)) {
                    return name;
                }
            }
        } catch (Exception e) {
            log.warn("获取发布人名称失败: {}", e.getMessage());
        }
        Long uid = SecurityUtils.getCurrentUserId();
        return uid != null ? ("用户#" + uid) : "system";
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int migrateLegacyPages() {
        List<Page> pages = pageMapper.selectList(null);
        int n = 0;
        for (Page page : pages) {
            if (!isLegacyArchiveCandidate(page)) {
                continue;
            }
            boolean already = Integer.valueOf(1).equals(page.getArchived())
                    && "archived".equals(page.getPageGroup());
            if (already) {
                continue;
            }
            page.setArchived(1);
            page.setPageGroup("archived");
            pageMapper.updateById(page);
            n++;
        }
        if (n > 0) {
            log.info("小程序页面迁移：新归档 {} 条（名称含归档或 path/name 以 tpl- 开头）", n);
        }
        // 回填校验：若有 is_current 整店模板，确认可读（fillTemplate 同源逻辑）
        try {
            MiniappRelease current = miniappReleaseService.lambdaQuery()
                    .eq(MiniappRelease::getIsCurrent, 1)
                    .last("LIMIT 1")
                    .one();
            if (current != null) {
                String readableName = StoreTemplateNames.display(
                        current.getTemplateName(), current.getSemver(), current.getReleaseNotes());
                log.debug("整店模板可读：id={} name={}", current.getId(), readableName);
            }
        } catch (Exception e) {
            log.warn("校验 is_current 整店模板可读性失败（可忽略）: {}", e.getMessage());
        }
        return n;
    }

    /** 名称含「归档」，或 path / name 以 tpl- 开头（大小写不敏感） */
    static boolean isLegacyArchiveCandidate(Page page) {
        String name = page.getName() == null ? "" : page.getName();
        String path = page.getPath() == null ? "" : page.getPath();
        String nameLower = name.toLowerCase();
        String pathLower = path.toLowerCase();
        return name.contains("归档")
                || nameLower.startsWith("tpl-")
                || pathLower.startsWith("tpl-");
    }
}
