package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.ActivitySignupVO;
import com.miniprogram.dto.ActivityVO;
import com.miniprogram.service.ActivityService;
import com.miniprogram.service.ActivitySignupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/mp/activities")
@RequiredArgsConstructor
@Tag(name = "小程序-活动")
public class MpActivityController {

    private final ActivityService activityService;
    private final ActivitySignupService activitySignupService;

    @GetMapping
    @Operation(summary = "活动列表")
    public R<PageResult<ActivityVO>> listActivities(@RequestParam(required = false) String keyword,
                                                     @RequestParam(required = false) String type,
                                                     @RequestParam(defaultValue = "1") Long current,
                                                     @RequestParam(defaultValue = "10") Long size) {
        return R.ok(activityService.listActivities(keyword, type, 1, current, size));
    }

    @GetMapping("/{id}")
    @Operation(summary = "活动详情")
    public R<ActivityVO> getActivityDetail(@PathVariable Long id) {
        return R.ok(activityService.getActivityDetail(id));
    }

    @PostMapping("/{id}/signup")
    @Operation(summary = "提交活动报名")
    public R<ActivitySignupVO> signup(@PathVariable Long id, @RequestBody SignupRequest request) {
        return R.ok(activitySignupService.createSignup(id, request.getName(), request.getPhone(), request.getSession()));
    }

    @Data
    public static class SignupRequest {
        private String name;
        private String phone;
        private String session;
        private String remark;
    }
}
