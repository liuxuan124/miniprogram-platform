package com.miniprogram.controller;

import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.R;
import com.miniprogram.dto.wechat.ImportTaskVO;
import com.miniprogram.dto.wechat.WeChatContentSyncRequestDTO;
import com.miniprogram.dto.wechat.WeChatContentSyncResultVO;
import com.miniprogram.dto.wechat.WeChatUrlImportRequestDTO;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.ContentCategoryService;
import com.miniprogram.service.ImportTaskService;
import com.miniprogram.service.WeChatOfficialAccountContentSyncService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

/**
 * 微信公众号管理
 */
@Slf4j
@Tag(name = "微信公众号", description = "公众号内容同步")
@RestController
@RequestMapping("/api/v1/admin/wechat/official-account")
@RequiredArgsConstructor
public class WeChatOfficialAccountController {

    private static final int MAX_URL_IMPORT = 10;

    private final WeChatOfficialAccountContentSyncService contentSyncService;
    private final ImportTaskService importTaskService;
    private final ContentCategoryService categoryService;

    @Operation(summary = "全量同步已发布图文", description = "异步导入：立即返回 taskId，通过 /import-tasks/{id} 轮询进度")
    @PostMapping("/sync-published")
    @PreAuthorize("hasAuthority('content:update')")
    public R<?> syncPublished(@RequestBody(required = false) WeChatContentSyncRequestDTO request) {
        WeChatContentSyncRequestDTO safe = request != null ? request : new WeChatContentSyncRequestDTO();
        validateCategory(safe.getCategoryId());

        ImportTaskVO task;
        try {
            task = importTaskService.tryStart("sync", SecurityUtils.getCurrentUserId());
        } catch (Exception e) {
            log.warn("异步导入不可用，降级同步: {}", e.getMessage());
            return R.ok(contentSyncService.syncAllPublished(safe));
        }
        if (!task.isJustCreated()) {
            return R.ok("已有导入任务正在执行，返回该任务进度", task);
        }
        try {
            contentSyncService.syncAllPublishedAsync(safe, task.getTaskId());
        } catch (Exception submitEx) {
            importTaskService.fail(task.getTaskId(), submitEx.getMessage());
            throw new BusinessException(ErrorCode.DATA_SAVE_FAILED,
                    "导入任务提交失败: " + submitEx.getMessage());
        }
        return R.ok(task);
    }

    @Operation(summary = "公众号链接导入", description = "异步导入链接文章，立即返回 taskId")
    @PostMapping("/import-urls")
    @PreAuthorize("hasAuthority('content:create') or hasAuthority('content:update')")
    public R<?> importUrls(@RequestBody WeChatUrlImportRequestDTO request) {
        WeChatUrlImportRequestDTO safe = request != null ? request : new WeChatUrlImportRequestDTO();
        validateCategory(safe.getCategoryId());
        List<String> urls = normalizeUrls(safe.getUrls());
        if (urls.isEmpty()) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "请至少填写一条公众号文章链接");
        }
        if (urls.size() > MAX_URL_IMPORT) {
            throw new BusinessException(ErrorCode.PARAM_ERROR,
                    "单次最多导入 " + MAX_URL_IMPORT + " 条链接，请分批提交");
        }
        safe.setUrls(urls);

        ImportTaskVO task;
        try {
            task = importTaskService.tryStart("url", SecurityUtils.getCurrentUserId());
        } catch (Exception e) {
            log.warn("异步链接导入不可用，降级同步: {}", e.getMessage());
            return R.ok(contentSyncService.importFromUrls(safe));
        }
        if (!task.isJustCreated()) {
            return R.ok("已有导入任务正在执行，返回该任务进度", task);
        }
        try {
            contentSyncService.importFromUrlsAsync(safe, task.getTaskId());
        } catch (Exception submitEx) {
            importTaskService.fail(task.getTaskId(), submitEx.getMessage());
            throw new BusinessException(ErrorCode.DATA_SAVE_FAILED,
                    "导入任务提交失败: " + submitEx.getMessage());
        }
        return R.ok(task);
    }

    @Operation(summary = "查询导入任务进度")
    @GetMapping("/import-tasks/{taskId}")
    @PreAuthorize("hasAuthority('content:list')")
    public R<ImportTaskVO> getTask(@PathVariable String taskId) {
        ImportTaskVO task = importTaskService.get(taskId);
        if (task == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "导入任务不存在或已过期");
        }
        return R.ok(task);
    }

    @Operation(summary = "查询当前进行中的导入任务")
    @GetMapping("/import-tasks/running")
    @PreAuthorize("hasAuthority('content:list')")
    public R<ImportTaskVO> getRunning() {
        try {
            return R.ok(importTaskService.getRunning());
        } catch (Exception e) {
            log.warn("查询进行中导入任务失败: {}", e.getMessage());
            return R.ok(null);
        }
    }

    private void validateCategory(Long categoryId) {
        if (categoryId != null && categoryService.getById(categoryId) == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "分类不存在");
        }
    }

    private List<String> normalizeUrls(List<String> rawUrls) {
        List<String> urls = new ArrayList<>();
        if (rawUrls == null) {
            return urls;
        }
        for (String line : rawUrls) {
            if (!StringUtils.hasText(line)) {
                continue;
            }
            for (String part : line.split("[\\s,，;；]+")) {
                if (StringUtils.hasText(part)) {
                    urls.add(part.trim());
                }
            }
        }
        return urls;
    }
}
