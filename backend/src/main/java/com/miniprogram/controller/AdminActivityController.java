package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.ActivityDTO;
import com.miniprogram.dto.ActivitySignupVO;
import com.miniprogram.dto.ActivityVO;
import com.miniprogram.service.ActivityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 后台-活动管理
 */
@RestController
@RequestMapping("/api/v1/admin/activities")
@RequiredArgsConstructor
@Tag(name = "后台-活动管理")
public class AdminActivityController {

    private final ActivityService activityService;

    @GetMapping
    @Operation(summary = "活动列表")
    public R<PageResult<ActivityVO>> listActivities(@RequestParam(required = false) String keyword,
                                                     @RequestParam(required = false) String type,
                                                     @RequestParam(required = false) Integer status,
                                                     @RequestParam(defaultValue = "1") Long current,
                                                     @RequestParam(defaultValue = "10") Long size) {
        return R.ok(activityService.listActivities(keyword, type, status, current, size));
    }

    @GetMapping("/{id}")
    @Operation(summary = "活动详情")
    public R<ActivityVO> getActivityDetail(@PathVariable Long id) {
        return R.ok(activityService.getActivityDetail(id));
    }

    @PostMapping
    @Operation(summary = "创建活动")
    public R<ActivityVO> createActivity(@Valid @RequestBody ActivityDTO dto) {
        return R.ok(activityService.createActivity(dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新活动")
    public R<ActivityVO> updateActivity(@PathVariable Long id, @Valid @RequestBody ActivityDTO dto) {
        return R.ok(activityService.updateActivity(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除活动")
    public R<Void> deleteActivity(@PathVariable Long id) {
        activityService.deleteActivity(id);
        return R.ok(null);
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "更新活动状态")
    public R<ActivityVO> updateStatus(@PathVariable Long id, @RequestParam Integer status) {
        return R.ok(activityService.updateStatus(id, status));
    }

    // ==================== 报名管理 ====================

    @GetMapping("/{id}/signups")
    @Operation(summary = "报名列表")
    public R<PageResult<ActivitySignupVO>> listSignups(@PathVariable Long id,
                                                        @RequestParam(required = false) String status,
                                                        @RequestParam(defaultValue = "1") Long current,
                                                        @RequestParam(defaultValue = "10") Long size) {
        return R.ok(activityService.listSignups(id, status, current, size));
    }

    @PutMapping("/signups/{signupId}/approve")
    @Operation(summary = "审核报名")
    public R<ActivitySignupVO> approveSignup(@PathVariable Long signupId,
                                              @RequestParam Boolean approved) {
        return R.ok(activityService.approveSignup(signupId, approved));
    }
}
