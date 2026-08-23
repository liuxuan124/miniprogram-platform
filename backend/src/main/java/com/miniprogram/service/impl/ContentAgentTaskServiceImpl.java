package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.contentagent.ContentAgentApplyResultVO;
import com.miniprogram.dto.contentagent.ContentAgentTaskItemVO;
import com.miniprogram.dto.contentagent.ContentAgentTaskType;
import com.miniprogram.dto.contentagent.ContentAgentTaskVO;
import com.miniprogram.dto.contentagent.CreateContentAgentTaskDTO;
import com.miniprogram.dto.contentagent.ReviewContentAgentItemsDTO;
import com.miniprogram.dto.module.CreateModuleVersionDTO;
import com.miniprogram.entity.AgentTask;
import com.miniprogram.entity.AgentTaskItem;
import com.miniprogram.entity.Content;
import com.miniprogram.entity.ContentProduct;
import com.miniprogram.entity.ModuleVersion;
import com.miniprogram.mapper.AgentTaskItemMapper;
import com.miniprogram.mapper.AgentTaskMapper;
import com.miniprogram.mapper.ContentMapper;
import com.miniprogram.mapper.ContentProductMapper;
import com.miniprogram.service.ContentAgentTaskService;
import com.miniprogram.service.ModuleVersionService;
import com.miniprogram.service.contentagent.ContentAgentExecutor;
import com.miniprogram.service.contentagent.ContentAgentTaskRunner;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContentAgentTaskServiceImpl implements ContentAgentTaskService {

    private static final String TASK_KEY_PREFIX = "content:agent:";
    private static final String RUNNING_KEY = "content:agent:running";
    private static final Duration TASK_TTL = Duration.ofHours(24);
    private static final Duration RUNNING_TTL = Duration.ofHours(2);
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final int DAILY_TOKEN_BUDGET = 500_000;

    private final AgentTaskMapper agentTaskMapper;
    private final AgentTaskItemMapper agentTaskItemMapper;
    private final ContentMapper contentMapper;
    private final ContentProductMapper contentProductMapper;
    private final ContentAgentExecutor contentAgentExecutor;
    private final ContentAgentTaskRunner contentAgentTaskRunner;
    private final ModuleVersionService moduleVersionService;
    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ContentAgentTaskVO createTask(CreateContentAgentTaskDTO dto, Long operatorId) {
        ContentAgentTaskVO running = getRunning();
        if (running != null && isActive(running)) {
            running.setJustCreated(false);
            return running;
        }

        List<String> types = dto.getTaskTypes().stream().distinct().collect(Collectors.toList());
        List<Long> contentIds = dto.getContentIds() != null ? dto.getContentIds() : List.of();

        boolean needsContent = types.stream().anyMatch(t -> {
            ContentAgentTaskType ct = ContentAgentTaskType.fromCode(t);
            return ct != null && ct != ContentAgentTaskType.ANALYTICS_REVIEW
                    && ct != ContentAgentTaskType.TOPIC_DRAFT;
        });
        if (needsContent && contentIds.isEmpty()) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "请勾选至少一篇内容");
        }

        AgentTask task = new AgentTask();
        task.setRole("content_ops");
        try {
            task.setTaskTypes(objectMapper.writeValueAsString(types));
            task.setScope(objectMapper.writeValueAsString(contentIds));
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "任务参数序列化失败");
        }
        task.setStatus("pending");
        task.setTotal(estimateTotal(types, contentIds));
        task.setProcessed(0);
        task.setOperatorId(operatorId);
        task.setCostTokens(0);
        task.setFreeformPrompt(dto.getFreeformPrompt());
        task.setIdempotencyKey(dto.getIdempotencyKey());
        agentTaskMapper.insert(task);

        ContentAgentTaskVO vo = toVo(task);
        vo.setJustCreated(true);
        saveRedis(vo);

        Boolean locked = stringRedisTemplate.opsForValue()
                .setIfAbsent(RUNNING_KEY, String.valueOf(task.getId()), RUNNING_TTL);
        if (!Boolean.TRUE.equals(locked)) {
            agentTaskMapper.deleteById(task.getId());
            stringRedisTemplate.delete(TASK_KEY_PREFIX + task.getId());
            ContentAgentTaskVO raced = getRunning();
            if (raced != null) {
                raced.setJustCreated(false);
                return raced;
            }
        }

        runTaskAsync(task.getId(), types, contentIds, dto.getFreeformPrompt(), dto.getTargetFormat());
        return vo;
    }

    private void runTaskAsync(Long taskId, List<String> types, List<Long> contentIds,
                              String freeformPrompt, String targetFormat) {
        contentAgentTaskRunner.run(taskId, types, contentIds, freeformPrompt, targetFormat);
    }

    /** 由 ContentAgentTaskRunner 异步调用 */
    public void executeTask(Long taskId, List<String> types, List<Long> contentIds,
                            String freeformPrompt, String targetFormat) {
        AgentTask task = agentTaskMapper.selectById(taskId);
        if (task == null) return;

        task.setStatus("running");
        agentTaskMapper.updateById(task);
        updateRedisStatus(taskId, "running", 0, task.getTotal(), null);

        int processed = 0;
        int tokens = 0;
        try {
            Set<String> globalTypes = Set.of(
                    ContentAgentTaskType.ANALYTICS_REVIEW.getCode(),
                    ContentAgentTaskType.TOPIC_DRAFT.getCode());
            for (String typeCode : types) {
                if (globalTypes.contains(typeCode)) {
                    ContentAgentExecutor.ExecResult r = contentAgentExecutor.executeGlobal(typeCode, freeformPrompt);
                    tokens += r.tokensUsed;
                    saveItems(taskId, r.items);
                    processed++;
                    updateRedisProgress(taskId, processed, task.getTotal(), typeCode);
                    continue;
                }
                for (Long contentId : contentIds) {
                    Content content = contentMapper.selectById(contentId);
                    if (content == null) continue;
                    if (tokens > DAILY_TOKEN_BUDGET) {
                        throw new BusinessException(ErrorCode.PARAM_ERROR, "已达日 token 预算上限，任务已中止");
                    }
                    updateRedisProgress(taskId, processed, task.getTotal(), content.getTitle());
                    ContentAgentExecutor.ExecResult r = contentAgentExecutor.execute(
                            typeCode, content, freeformPrompt, targetFormat);
                    tokens += r.tokensUsed;
                    saveItems(taskId, r.items);
                    processed++;
                    updateRedisProgress(taskId, processed, task.getTotal(), content.getTitle());
                }
            }
            task.setStatus("review");
            task.setProcessed(processed);
            task.setCostTokens(tokens);
            agentTaskMapper.updateById(task);
            finishRedis(taskId, "review", processed, tokens, null);
        } catch (Exception e) {
            log.error("Content agent task failed taskId={}: {}", taskId, e.getMessage(), e);
            task.setStatus("failed");
            task.setErrorMessage(e.getMessage());
            task.setProcessed(processed);
            task.setCostTokens(tokens);
            agentTaskMapper.updateById(task);
            finishRedis(taskId, "failed", processed, tokens, e.getMessage());
        } finally {
            stringRedisTemplate.delete(RUNNING_KEY);
        }
    }

    private void saveItems(Long taskId, List<AgentTaskItem> items) {
        for (AgentTaskItem item : items) {
            item.setTaskId(taskId);
            agentTaskItemMapper.insert(item);
        }
    }

    @Override
    public ContentAgentTaskVO getTask(Long taskId) {
        AgentTask task = agentTaskMapper.selectById(taskId);
        if (task == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "任务不存在");
        }
        ContentAgentTaskVO vo = mergeRedis(toVo(task));
        enrichCounts(vo, taskId);
        return vo;
    }

    @Override
    public ContentAgentTaskVO getRunning() {
        String runningId = stringRedisTemplate.opsForValue().get(RUNNING_KEY);
        if (!StringUtils.hasText(runningId)) {
            AgentTask db = agentTaskMapper.selectOne(new LambdaQueryWrapper<AgentTask>()
                    .in(AgentTask::getStatus, List.of("pending", "running"))
                    .orderByDesc(AgentTask::getCreateTime)
                    .last("LIMIT 1"));
            if (db == null) return null;
            return mergeRedis(toVo(db));
        }
        try {
            return getTask(Long.parseLong(runningId));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    @Override
    public PageResult<ContentAgentTaskItemVO> listItems(Long taskId, String reviewStatus, Long current, Long size) {
        LambdaQueryWrapper<AgentTaskItem> w = new LambdaQueryWrapper<AgentTaskItem>()
                .eq(AgentTaskItem::getTaskId, taskId)
                .orderByAsc(AgentTaskItem::getContentId)
                .orderByAsc(AgentTaskItem::getId);
        if (StringUtils.hasText(reviewStatus)) {
            w.eq(AgentTaskItem::getReviewStatus, reviewStatus);
        }
        Page<AgentTaskItem> page = agentTaskItemMapper.selectPage(new Page<>(current, size), w);
        Map<Long, String> titles = loadTitles(page.getRecords());
        PageResult<ContentAgentTaskItemVO> result = new PageResult<>();
        result.setCurrent(page.getCurrent());
        result.setSize(page.getSize());
        result.setTotal(page.getTotal());
        result.setRecords(page.getRecords().stream()
                .map(i -> toItemVo(i, titles.get(i.getContentId())))
                .collect(Collectors.toList()));
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void reviewItems(Long taskId, ReviewContentAgentItemsDTO dto) {
        String action = dto.getAction();
        if (!"accept".equals(action) && !"reject".equals(action)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "action 须为 accept 或 reject");
        }
        for (Long itemId : dto.getItemIds()) {
            AgentTaskItem item = agentTaskItemMapper.selectById(itemId);
            if (item == null || !taskId.equals(item.getTaskId())) continue;
            item.setReviewStatus("accept".equals(action) ? "accepted" : "rejected");
            if ("reject".equals(action)) {
                item.setRejectReason(dto.getRejectReason());
            }
            agentTaskItemMapper.updateById(item);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ContentAgentApplyResultVO applyAccepted(Long taskId) {
        List<AgentTaskItem> items = agentTaskItemMapper.selectList(new LambdaQueryWrapper<AgentTaskItem>()
                .eq(AgentTaskItem::getTaskId, taskId)
                .eq(AgentTaskItem::getReviewStatus, "accepted"));
        ContentAgentApplyResultVO result = new ContentAgentApplyResultVO();
        int applied = 0;
        int skipped = 0;

        Map<Long, List<AgentTaskItem>> byContent = items.stream()
                .filter(i -> i.getContentId() != null && i.getContentId() > 0)
                .filter(i -> !"_qc".equals(i.getField()) && !"_report".equals(i.getField()) && !"_share".equals(i.getField()))
                .collect(Collectors.groupingBy(AgentTaskItem::getContentId));

        for (Map.Entry<Long, List<AgentTaskItem>> entry : byContent.entrySet()) {
            Long contentId = entry.getKey();
            Content content = contentMapper.selectById(contentId);
            if (content == null) {
                skipped += entry.getValue().size();
                continue;
            }
            snapshotContent(content, "Agent 采纳前快照 task#" + taskId);
            for (AgentTaskItem item : entry.getValue()) {
                if (applyItem(content, item)) {
                    item.setReviewStatus("applied");
                    agentTaskItemMapper.updateById(item);
                    applied++;
                } else {
                    skipped++;
                }
            }
            contentMapper.updateById(content);
        }

        AgentTask task = agentTaskMapper.selectById(taskId);
        if (task != null) {
            task.setStatus("completed");
            agentTaskMapper.updateById(task);
        }
        result.setAppliedCount(applied);
        result.setSkippedCount(skipped);
        result.setMessage("已采纳 " + applied + " 项" + (skipped > 0 ? "，跳过 " + skipped + " 项" : ""));
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void rollbackContent(Long contentId, Long versionId) {
        ModuleVersion version = moduleVersionService.getVersionDetail(versionId);
        if (!"content".equals(version.getModuleType()) || !contentId.equals(version.getTargetId())) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "版本与内容不匹配");
        }
        Content content = contentMapper.selectById(contentId);
        if (content == null) {
            throw new BusinessException(ErrorCode.CONTENT_NOT_FOUND);
        }
        try {
            Map<String, Object> snap = objectMapper.readValue(version.getVersionData(), new TypeReference<>() {});
            restoreFromSnapshot(content, snap);
            contentMapper.updateById(content);
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "快照还原失败：" + e.getMessage());
        }
    }

    @Override
    public List<Map<String, Object>> listTaskTypes() {
        return ContentAgentTaskType.toOptionList();
    }

    private boolean applyItem(Content content, AgentTaskItem item) {
        if ("published".equals(content.getStatus()) && "content".equals(item.getField())) {
            return false;
        }
        String field = item.getField();
        String val = item.getNewValue();
        if (!StringUtils.hasText(val)) return false;
        try {
            switch (field) {
                case "categoryId" -> content.setCategoryId(Long.parseLong(val.trim()));
                case "summary" -> content.setSummary(val);
                case "seoTitle" -> content.setSeoTitle(val);
                case "seoDescription" -> content.setSeoDescription(val);
                case "coverImage" -> content.setCoverImage(val);
                case "content" -> content.setContent(val);
                case "tags" -> content.setTags(val.startsWith("[") ? val : objectMapper.writeValueAsString(List.of(val.split(","))));
                case "scheduledAt" -> content.setScheduledAt(LocalDateTime.parse(val, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
                case "productIds" -> {
                    bindProducts(content.getId(), val);
                    return true;
                }
                default -> {
                    return false;
                }
            }
            if (StringUtils.hasText(item.getExtraJson()) && "content".equals(field)) {
                Map<String, Object> meta = objectMapper.readValue(item.getExtraJson(), new TypeReference<>() {});
                if (meta.get("title") != null) content.setTitle(String.valueOf(meta.get("title")));
                if (meta.get("contentType") != null) content.setContentType(String.valueOf(meta.get("contentType")));
            }
            return true;
        } catch (Exception e) {
            log.warn("apply item {} failed: {}", item.getId(), e.getMessage());
            return false;
        }
    }

    private void bindProducts(Long contentId, String val) throws Exception {
        List<Long> ids = new ArrayList<>();
        if (val.trim().startsWith("[")) {
            ids = objectMapper.readValue(val, new TypeReference<>() {});
        }
        contentProductMapper.delete(new LambdaQueryWrapper<ContentProduct>().eq(ContentProduct::getContentId, contentId));
        int order = 0;
        for (Long pid : ids) {
            if (pid == null) continue;
            ContentProduct row = new ContentProduct();
            row.setContentId(contentId);
            row.setProductId(pid);
            row.setSortOrder(order++);
            contentProductMapper.insert(row);
        }
    }

    private void snapshotContent(Content content, String summary) {
        try {
            CreateModuleVersionDTO dto = new CreateModuleVersionDTO();
            dto.setModuleType("content");
            dto.setTargetId(content.getId());
            dto.setChangeSummary(summary);
            dto.setVersionData(objectMapper.writeValueAsString(content));
            ModuleVersion v = moduleVersionService.createVersion(dto);
            moduleVersionService.publishVersion(v.getId());
        } catch (Exception e) {
            log.warn("content snapshot failed id={}: {}", content.getId(), e.getMessage());
        }
    }

    private void restoreFromSnapshot(Content content, Map<String, Object> snap) {
        if (snap.get("title") != null) content.setTitle(String.valueOf(snap.get("title")));
        if (snap.get("content") != null) content.setContent(String.valueOf(snap.get("content")));
        if (snap.get("summary") != null) content.setSummary(String.valueOf(snap.get("summary")));
        if (snap.get("seoTitle") != null) content.setSeoTitle(String.valueOf(snap.get("seoTitle")));
        if (snap.get("seoDescription") != null) content.setSeoDescription(String.valueOf(snap.get("seoDescription")));
        if (snap.get("coverImage") != null) content.setCoverImage(String.valueOf(snap.get("coverImage")));
        if (snap.get("tags") != null) content.setTags(String.valueOf(snap.get("tags")));
        if (snap.get("categoryId") != null) content.setCategoryId(Long.valueOf(String.valueOf(snap.get("categoryId"))));
    }

    private int estimateTotal(List<String> types, List<Long> contentIds) {
        int n = contentIds.size();
        int total = 0;
        for (String t : types) {
            if (ContentAgentTaskType.ANALYTICS_REVIEW.getCode().equals(t)
                    || ContentAgentTaskType.TOPIC_DRAFT.getCode().equals(t)) {
                total += 1;
            } else {
                total += n;
            }
        }
        return Math.max(total, 1);
    }

    private Map<Long, String> loadTitles(List<AgentTaskItem> items) {
        Set<Long> ids = items.stream().map(AgentTaskItem::getContentId)
                .filter(id -> id != null && id > 0).collect(Collectors.toSet());
        if (ids.isEmpty()) return Map.of();
        List<Content> list = contentMapper.selectBatchIds(ids);
        return list.stream().collect(Collectors.toMap(Content::getId, Content::getTitle, (a, b) -> a));
    }

    private ContentAgentTaskItemVO toItemVo(AgentTaskItem item, String title) {
        ContentAgentTaskItemVO vo = new ContentAgentTaskItemVO();
        vo.setId(item.getId());
        vo.setTaskId(item.getTaskId());
        vo.setContentId(item.getContentId());
        vo.setContentTitle(title);
        vo.setTaskType(item.getTaskType());
        ContentAgentTaskType t = ContentAgentTaskType.fromCode(item.getTaskType());
        vo.setTaskTypeLabel(t != null ? t.getLabel() : item.getTaskType());
        vo.setField(item.getField());
        vo.setFieldLabel(fieldLabel(item.getField()));
        vo.setOldValue(item.getOldValue());
        vo.setNewValue(item.getNewValue());
        vo.setConfidence(item.getConfidence());
        vo.setReviewStatus(item.getReviewStatus());
        vo.setRejectReason(item.getRejectReason());
        vo.setIssueLevel(item.getIssueLevel());
        vo.setIssueCode(item.getIssueCode());
        vo.setExtraJson(item.getExtraJson());
        vo.setSnapshotVersionId(item.getSnapshotVersionId());
        vo.setBodyField("content".equals(item.getField()));
        return vo;
    }

    private String fieldLabel(String field) {
        return switch (field != null ? field : "") {
            case "categoryId" -> "分类";
            case "tags" -> "标签";
            case "summary" -> "摘要";
            case "seoTitle" -> "SEO标题";
            case "seoDescription" -> "SEO描述";
            case "coverImage" -> "封面";
            case "content" -> "正文";
            case "scheduledAt" -> "定时发布";
            case "productIds" -> "挂载商品";
            case "_qc" -> "质检";
            case "_report" -> "报告";
            case "_share" -> "分享文案";
            default -> field;
        };
    }

    private ContentAgentTaskVO toVo(AgentTask task) {
        ContentAgentTaskVO vo = new ContentAgentTaskVO();
        vo.setId(task.getId());
        vo.setTaskId(String.valueOf(task.getId()));
        vo.setRole(task.getRole());
        vo.setStatus(task.getStatus());
        vo.setTotal(task.getTotal());
        vo.setProcessed(task.getProcessed());
        vo.setOperatorId(task.getOperatorId());
        vo.setCostTokens(task.getCostTokens());
        vo.setFreeformPrompt(task.getFreeformPrompt());
        vo.setErrorMessage(task.getErrorMessage());
        try {
            if (StringUtils.hasText(task.getTaskTypes())) {
                vo.setTaskTypes(objectMapper.readValue(task.getTaskTypes(), new TypeReference<>() {}));
            }
            if (StringUtils.hasText(task.getScope())) {
                vo.setContentIds(objectMapper.readValue(task.getScope(), new TypeReference<>() {}));
            }
        } catch (Exception ignored) {
        }
        if (task.getCreateTime() != null) {
            vo.setStartedAt(task.getCreateTime().format(ISO));
        }
        if ("completed".equals(task.getStatus()) || "review".equals(task.getStatus()) || "failed".equals(task.getStatus())) {
            if (task.getUpdateTime() != null) {
                vo.setFinishedAt(task.getUpdateTime().format(ISO));
            }
        }
        return vo;
    }

    private void enrichCounts(ContentAgentTaskVO vo, Long taskId) {
        long pending = agentTaskItemMapper.selectCount(new LambdaQueryWrapper<AgentTaskItem>()
                .eq(AgentTaskItem::getTaskId, taskId)
                .eq(AgentTaskItem::getReviewStatus, "pending")
                .ne(AgentTaskItem::getField, "_qc"));
        long issues = agentTaskItemMapper.selectCount(new LambdaQueryWrapper<AgentTaskItem>()
                .eq(AgentTaskItem::getTaskId, taskId)
                .eq(AgentTaskItem::getField, "_qc"));
        vo.setPendingReviewCount((int) pending);
        vo.setIssueCount((int) issues);
    }

    private ContentAgentTaskVO mergeRedis(ContentAgentTaskVO vo) {
        if (vo.getId() == null) return vo;
        try {
            String json = stringRedisTemplate.opsForValue().get(TASK_KEY_PREFIX + vo.getId());
            if (!StringUtils.hasText(json)) return vo;
            ContentAgentTaskVO cached = objectMapper.readValue(json, ContentAgentTaskVO.class);
            if (cached.getProcessed() != null) vo.setProcessed(cached.getProcessed());
            if (cached.getTotal() != null) vo.setTotal(cached.getTotal());
            if (cached.getStatus() != null) vo.setStatus(cached.getStatus());
            if (cached.getCurrentTitle() != null) vo.setCurrentTitle(cached.getCurrentTitle());
            if (cached.getErrorMessage() != null) vo.setErrorMessage(cached.getErrorMessage());
            if (cached.getFinishedAt() != null) vo.setFinishedAt(cached.getFinishedAt());
        } catch (Exception ignored) {
        }
        return vo;
    }

    private void saveRedis(ContentAgentTaskVO vo) {
        try {
            stringRedisTemplate.opsForValue().set(
                    TASK_KEY_PREFIX + vo.getId(),
                    objectMapper.writeValueAsString(vo),
                    TASK_TTL);
        } catch (Exception e) {
            log.warn("save redis task failed: {}", e.getMessage());
        }
    }

    private void updateRedisStatus(Long taskId, String status, int processed, int total, String title) {
        AgentTask task = agentTaskMapper.selectById(taskId);
        if (task == null) return;
        ContentAgentTaskVO vo = toVo(task);
        vo.setStatus(status);
        vo.setProcessed(processed);
        vo.setTotal(total);
        vo.setCurrentTitle(title);
        saveRedis(vo);
        stringRedisTemplate.expire(RUNNING_KEY, RUNNING_TTL);
    }

    private void updateRedisProgress(Long taskId, int processed, int total, String title) {
        updateRedisStatus(taskId, "running", processed, total, title);
        AgentTask t = agentTaskMapper.selectById(taskId);
        if (t != null) {
            t.setProcessed(processed);
            agentTaskMapper.updateById(t);
        }
    }

    private void finishRedis(Long taskId, String status, int processed, int tokens, String error) {
        AgentTask task = agentTaskMapper.selectById(taskId);
        if (task == null) return;
        ContentAgentTaskVO vo = toVo(task);
        vo.setStatus(status);
        vo.setProcessed(processed);
        vo.setCostTokens(tokens);
        vo.setErrorMessage(error);
        vo.setFinishedAt(LocalDateTime.now().format(ISO));
        saveRedis(vo);
    }

    private boolean isActive(ContentAgentTaskVO vo) {
        return vo != null && ("pending".equals(vo.getStatus()) || "running".equals(vo.getStatus()));
    }
}
