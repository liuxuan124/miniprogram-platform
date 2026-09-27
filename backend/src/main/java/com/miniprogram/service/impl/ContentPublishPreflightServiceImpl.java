package com.miniprogram.service.impl;

import com.miniprogram.common.BusinessException;
import com.miniprogram.dto.mini.ContentPreflightVO;
import com.miniprogram.dto.mini.PendingChangeVO;
import com.miniprogram.dto.mini.PendingChangesVO;
import com.miniprogram.dto.miniapp.PublishPreflightVO;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.ContentPublishPreflightService;
import com.miniprogram.service.MiniappReleaseService;
import com.miniprogram.service.WxCodeManifestService;
import com.miniprogram.service.mini.MiniSiteService;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ContentPublishPreflightServiceImpl implements ContentPublishPreflightService {

    /**
     * 没有待发布改动时的统一说明。
     * 注意：直接改库（迁移脚本 / 手工 SQL）不会被变更检测识别为改动，
     * 会出现「后台看着已经改了，但发不出去、小程序也看不到」的情况。
     */
    static final String NO_PENDING_CHANGE_REASON =
            "当前没有待发布的改动。若后台与小程序不一致，"
            + "通常是配置被直接写入数据库（如迁移脚本）而未经后台保存；"
            + "请在后台做一处真实改动并保存草稿后重试。";

    private final MiniSiteService miniSiteService;
    private final MiniappReleaseService miniappReleaseService;
    private final WxCodeManifestService wxCodeManifestService;

    public ContentPublishPreflightServiceImpl(
            @Lazy MiniSiteService miniSiteService,
            MiniappReleaseService miniappReleaseService,
            WxCodeManifestService wxCodeManifestService) {
        this.miniSiteService = miniSiteService;
        this.miniappReleaseService = miniappReleaseService;
        this.wxCodeManifestService = wxCodeManifestService;
    }

    @Override
    public ContentPreflightVO runPreflight(List<String> changeIds) {
        PendingChangesVO pending = miniSiteService.listPendingChanges();
        Set<String> selected = resolveSelected(changeIds, pending);
        PublishPreflightVO full = miniappReleaseService.getPublishPreflight();

        ContentPreflightVO vo = new ContentPreflightVO();
        Long tenantId = SecurityUtils.getCurrentTenantId() != null ? SecurityUtils.getCurrentTenantId() : 0L;
        wxCodeManifestService.appendManifestWarnings(vo.getWarnings(), tenantId);

        Map<String, PendingChangeVO> pendingById = new LinkedHashMap<>();
        for (PendingChangeVO item : pending.getItems() != null ? pending.getItems() : List.<PendingChangeVO>of()) {
            if (item != null && StringUtils.hasText(item.getChangeId())) {
                pendingById.put(item.getChangeId(), item);
            }
        }

        boolean allSelected = selected.isEmpty()
                || selected.size() >= pendingById.size()
                || pendingById.isEmpty();

        List<String> blocking = allSelected
                ? new ArrayList<>(full.getBlocking())
                : filterMessages(full.getBlocking(), selected, pendingById, true);
        List<String> warnings = allSelected
                ? new ArrayList<>(full.getWarnings())
                : filterMessages(full.getWarnings(), selected, pendingById, false);

        if (!allSelected && selected.isEmpty()) {
            blocking.add("请至少选择一项待发布改动");
        }

        for (String changeId : selected) {
            PendingChangeVO row = pendingById.get(changeId);
            ContentPreflightVO.Item item = new ContentPreflightVO.Item();
            item.setChangeId(changeId);
            if (row == null) {
                item.setCategory("unknown");
                item.setStatus("block");
                item.setBlockerReason("改动已不存在或已发布，请刷新列表");
                blocking.add(item.getBlockerReason() + "（" + changeId + "）");
                vo.getItems().add(item);
                continue;
            }
            item.setCategory("site".equals(row.getType()) ? "site" : "page");
            String reason = firstMatchingReason(blocking, row);
            if (reason != null) {
                item.setStatus("block");
                item.setBlockerReason(reason);
            } else {
                String warn = firstMatchingReason(warnings, row);
                if (warn != null) {
                    item.setStatus("warn");
                    item.setBlockerReason(warn);
                } else {
                    item.setStatus("ok");
                }
            }
            vo.getItems().add(item);
        }

        // 无待发布改动时也必须说明原因：否则前端只拿到 canPublish=false + 空 blocking，
        // 只能含糊地报「存在阻断项」，让人去找根本不存在的问题。
        if (selected.isEmpty()) {
            blocking.add(NO_PENDING_CHANGE_REASON);
        }

        vo.setBlocking(distinct(blocking));
        vo.setWarnings(distinct(warnings));
        // selected 为空的情况已并入 blocking，这里只需判断 blocking
        vo.setCanPublish(vo.getBlocking().isEmpty());
        return vo;
    }

    @Override
    public void assertCanPublish(List<String> changeIds) {
        ContentPreflightVO vo = runPreflight(changeIds);
        if (!vo.isCanPublish()) {
            String msg = vo.getBlocking().isEmpty()
                    ? "发布预检未通过（未给出具体原因，请检查预检实现）"
                    : String.join("；", vo.getBlocking());
            throw new BusinessException(100102, msg);
        }
    }

    private Set<String> resolveSelected(List<String> changeIds, PendingChangesVO pending) {
        LinkedHashSet<String> ids = new LinkedHashSet<>();
        if (changeIds != null) {
            for (String id : changeIds) {
                if (StringUtils.hasText(id)) {
                    ids.add(id.trim());
                }
            }
        }
        if (!ids.isEmpty()) {
            return ids;
        }
        for (PendingChangeVO item : pending.getItems() != null ? pending.getItems() : List.<PendingChangeVO>of()) {
            if (item != null && StringUtils.hasText(item.getChangeId())) {
                ids.add(item.getChangeId());
            }
        }
        return ids;
    }

    private List<String> filterMessages(List<String> messages, Set<String> selected,
                                        Map<String, PendingChangeVO> pendingById, boolean blocking) {
        if (messages == null || messages.isEmpty()) {
            return new ArrayList<>();
        }
        boolean siteSelected = selected.contains("site:*");
        List<String> pageNames = selected.stream()
                .filter(id -> id.startsWith("page:"))
                .map(id -> pendingById.get(id))
                .filter(Objects::nonNull)
                .map(PendingChangeVO::getName)
                .filter(StringUtils::hasText)
                .toList();

        List<String> out = new ArrayList<>();
        for (String line : messages) {
            if (!StringUtils.hasText(line)) {
                continue;
            }
            if (siteSelected && matchesSite(line)) {
                out.add(line);
                continue;
            }
            boolean pageHit = false;
            for (String name : pageNames) {
                if (line.contains("「" + name + "」") || line.contains(name)) {
                    pageHit = true;
                    break;
                }
            }
            if (pageHit) {
                out.add(line);
                continue;
            }
            if (blocking && isGlobalNavBlock(line)) {
                out.add(line);
            }
        }
        return out;
    }

    private boolean matchesSite(String line) {
        return line.contains("导航")
                || line.contains("首页")
                || line.contains("站点")
                || line.contains("底部")
                || line.contains("绑定");
    }

    private boolean isGlobalNavBlock(String line) {
        return line.contains("尚未绑定首页") || line.contains("底部导航需配置");
    }

    private String firstMatchingReason(List<String> messages, PendingChangeVO row) {
        if (messages == null) {
            return null;
        }
        String name = row.getName();
        for (String line : messages) {
            if ("site".equals(row.getType()) && matchesSite(line)) {
                return line;
            }
            if (StringUtils.hasText(name) && line.contains("「" + name + "」")) {
                return line;
            }
        }
        return null;
    }

    private List<String> distinct(List<String> in) {
        return in.stream().filter(StringUtils::hasText).distinct().collect(Collectors.toList());
    }
}
