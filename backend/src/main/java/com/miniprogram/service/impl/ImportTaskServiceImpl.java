package com.miniprogram.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.dto.wechat.ImportTaskVO;
import com.miniprogram.dto.wechat.WeChatContentSyncResultVO;
import com.miniprogram.service.ImportTaskService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * 公众号导入任务：进度存 Redis，全局互斥只允许一个任务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImportTaskServiceImpl implements ImportTaskService {

    private static final String TASK_KEY_PREFIX = "wechat:import:";
    private static final String RUNNING_KEY = "wechat:import:running";
    private static final Duration TASK_TTL = Duration.ofHours(24);
    private static final Duration RUNNING_TTL = Duration.ofHours(2);
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public ImportTaskVO tryStart(String type, Long operatorId) {
        ImportTaskVO existing = getRunning();
        if (existing != null && isActive(existing)) {
            existing.setJustCreated(false);
            return existing;
        }

        String taskId = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        ImportTaskVO task = new ImportTaskVO();
        task.setTaskId(taskId);
        task.setType(type);
        task.setStatus("pending");
        task.setTotal(0);
        task.setProcessed(0);
        task.setStartedAt(LocalDateTime.now().format(ISO));
        task.setOperatorId(operatorId);
        task.setJustCreated(true);

        save(task);

        Boolean locked = stringRedisTemplate.opsForValue()
                .setIfAbsent(RUNNING_KEY, taskId, RUNNING_TTL);
        if (!Boolean.TRUE.equals(locked)) {
            // 竞态：别人抢到了锁
            stringRedisTemplate.delete(TASK_KEY_PREFIX + taskId);
            ImportTaskVO raced = getRunning();
            if (raced != null) {
                raced.setJustCreated(false);
                return raced;
            }
            // 锁存在但任务读不到，覆盖锁
            stringRedisTemplate.opsForValue().set(RUNNING_KEY, taskId, RUNNING_TTL);
            return task;
        }
        return task;
    }

    @Override
    public void markRunning(String taskId) {
        ImportTaskVO task = get(taskId);
        if (task == null) {
            return;
        }
        task.setStatus("running");
        save(task);
    }

    @Override
    public void updateProgress(String taskId, int processed, int total, String currentTitle) {
        if (!StringUtils.hasText(taskId)) {
            return;
        }
        try {
            ImportTaskVO task = get(taskId);
            if (task == null) {
                return;
            }
            task.setStatus("running");
            task.setProcessed(Math.max(0, processed));
            if (total > 0) {
                task.setTotal(total);
            }
            if (currentTitle != null) {
                task.setCurrentTitle(currentTitle);
            }
            save(task);
            // 续期全局锁，避免长任务中途过期
            stringRedisTemplate.expire(RUNNING_KEY, RUNNING_TTL);
        } catch (Exception e) {
            log.warn("更新导入进度失败 taskId={}: {}", taskId, e.getMessage());
        }
    }

    @Override
    public void finish(String taskId, WeChatContentSyncResultVO result) {
        try {
            ImportTaskVO task = get(taskId);
            if (task == null) {
                task = new ImportTaskVO();
                task.setTaskId(taskId);
            }
            task.setStatus("success");
            task.setFinishedAt(LocalDateTime.now().format(ISO));
            task.setResult(result);
            task.setError(null);
            if (result != null && result.getTotalArticles() > 0 && task.getTotal() <= 0) {
                task.setTotal(result.getTotalArticles());
                task.setProcessed(result.getTotalArticles());
            }
            save(task);
        } finally {
            releaseLock(taskId);
        }
    }

    @Override
    public void fail(String taskId, String error) {
        try {
            ImportTaskVO task = get(taskId);
            if (task == null) {
                task = new ImportTaskVO();
                task.setTaskId(taskId);
                task.setStatus("failed");
            }
            task.setStatus("failed");
            task.setFinishedAt(LocalDateTime.now().format(ISO));
            task.setError(error != null ? error : "未知错误");
            save(task);
        } finally {
            releaseLock(taskId);
        }
    }

    @Override
    public ImportTaskVO get(String taskId) {
        if (!StringUtils.hasText(taskId)) {
            return null;
        }
        try {
            String json = stringRedisTemplate.opsForValue().get(TASK_KEY_PREFIX + taskId);
            if (!StringUtils.hasText(json)) {
                return null;
            }
            ImportTaskVO vo = objectMapper.readValue(json, ImportTaskVO.class);
            vo.setJustCreated(false);
            return vo;
        } catch (Exception e) {
            log.warn("读取导入任务失败 taskId={}: {}", taskId, e.getMessage());
            return null;
        }
    }

    @Override
    public ImportTaskVO getRunning() {
        try {
            String taskId = stringRedisTemplate.opsForValue().get(RUNNING_KEY);
            if (!StringUtils.hasText(taskId)) {
                return null;
            }
            ImportTaskVO task = get(taskId);
            if (task == null) {
                stringRedisTemplate.delete(RUNNING_KEY);
                return null;
            }
            if (!isActive(task)) {
                releaseLock(taskId);
                return null;
            }
            return task;
        } catch (Exception e) {
            log.warn("读取进行中导入任务失败: {}", e.getMessage());
            throw e instanceof RuntimeException re ? re : new RuntimeException(e);
        }
    }

    private boolean isActive(ImportTaskVO task) {
        if (task == null) {
            return false;
        }
        String status = task.getStatus();
        if (!"pending".equals(status) && !"running".equals(status)) {
            return false;
        }
        // startedAt 超过 2 小时视为失效
        if (StringUtils.hasText(task.getStartedAt())) {
            try {
                LocalDateTime started = LocalDateTime.parse(task.getStartedAt(), ISO);
                if (started.isBefore(LocalDateTime.now().minusHours(2))) {
                    return false;
                }
            } catch (Exception ignored) {
                // ignore parse error
            }
        }
        return true;
    }

    private void save(ImportTaskVO task) {
        try {
            String json = objectMapper.writeValueAsString(task);
            stringRedisTemplate.opsForValue().set(TASK_KEY_PREFIX + task.getTaskId(), json, TASK_TTL);
        } catch (Exception e) {
            throw new RuntimeException("保存导入任务失败: " + e.getMessage(), e);
        }
    }

    private void releaseLock(String taskId) {
        try {
            String running = stringRedisTemplate.opsForValue().get(RUNNING_KEY);
            if (taskId != null && taskId.equals(running)) {
                stringRedisTemplate.delete(RUNNING_KEY);
            }
        } catch (Exception e) {
            log.warn("释放导入锁失败 taskId={}: {}", taskId, e.getMessage());
        }
    }
}
