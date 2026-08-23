package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.contentagent.ContentAgentApplyResultVO;
import com.miniprogram.dto.contentagent.ContentAgentTaskItemVO;
import com.miniprogram.dto.contentagent.ContentAgentTaskVO;
import com.miniprogram.dto.contentagent.CreateContentAgentTaskDTO;
import com.miniprogram.dto.contentagent.ReviewContentAgentItemsDTO;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.ContentAgentTaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "内容 Agent", description = "内容管理 Agent 任务与审核")
@RestController
@RequestMapping("/api/v1/admin/content-agent")
@RequiredArgsConstructor
public class ContentAgentController {

    private final ContentAgentTaskService contentAgentTaskService;

    @Operation(summary = "可用任务类型")
    @GetMapping("/task-types")
    @PreAuthorize("hasAuthority('content:agent') or hasAuthority('content:list')")
    public R<List<Map<String, Object>>> listTaskTypes() {
        return R.ok(contentAgentTaskService.listTaskTypes());
    }

    @Operation(summary = "创建 Agent 任务")
    @PostMapping("/tasks")
    @PreAuthorize("hasAuthority('content:agent')")
    public R<ContentAgentTaskVO> createTask(@Valid @RequestBody CreateContentAgentTaskDTO dto) {
        Long operatorId = SecurityUtils.getCurrentUserId();
        return R.ok(contentAgentTaskService.createTask(dto, operatorId));
    }

    @Operation(summary = "查询任务详情/进度")
    @GetMapping("/tasks/{id}")
    @PreAuthorize("hasAuthority('content:agent') or hasAuthority('content:list')")
    public R<ContentAgentTaskVO> getTask(@PathVariable Long id) {
        return R.ok(contentAgentTaskService.getTask(id));
    }

    @Operation(summary = "进行中的任务")
    @GetMapping("/tasks/running")
    @PreAuthorize("hasAuthority('content:agent') or hasAuthority('content:list')")
    public R<ContentAgentTaskVO> getRunning() {
        ContentAgentTaskVO vo = contentAgentTaskService.getRunning();
        return R.ok(vo);
    }

    @Operation(summary = "任务明细列表")
    @GetMapping("/tasks/{id}/items")
    @PreAuthorize("hasAuthority('content:agent') or hasAuthority('content:list')")
    public R<PageResult<ContentAgentTaskItemVO>> listItems(
            @PathVariable Long id,
            @RequestParam(required = false) String reviewStatus,
            @RequestParam(defaultValue = "1") Long current,
            @RequestParam(defaultValue = "50") Long size) {
        return R.ok(contentAgentTaskService.listItems(id, reviewStatus, current, size));
    }

    @Operation(summary = "批量审核明细")
    @PostMapping("/tasks/{id}/items/review")
    @PreAuthorize("hasAuthority('content:agent')")
    public R<Void> reviewItems(@PathVariable Long id, @Valid @RequestBody ReviewContentAgentItemsDTO dto) {
        contentAgentTaskService.reviewItems(id, dto);
        return R.ok();
    }

    @Operation(summary = "采纳已接受的建议")
    @PostMapping("/tasks/{id}/apply")
    @PreAuthorize("hasAuthority('content:agent_apply')")
    public R<ContentAgentApplyResultVO> applyAccepted(@PathVariable Long id) {
        return R.ok(contentAgentTaskService.applyAccepted(id));
    }

    @Operation(summary = "回滚内容到 Agent 改动前")
    @PostMapping("/contents/{contentId}/rollback")
    @PreAuthorize("hasAuthority('content:agent_apply')")
    public R<Void> rollback(@PathVariable Long contentId, @RequestParam Long versionId) {
        contentAgentTaskService.rollbackContent(contentId, versionId);
        return R.ok();
    }
}
