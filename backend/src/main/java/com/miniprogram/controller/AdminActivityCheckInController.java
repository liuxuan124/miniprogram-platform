package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.entity.ActivityCheckIn;
import com.miniprogram.service.ActivityCheckInService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 后台-活动签到管理
 */
@RestController
@RequestMapping("/api/v1/admin/activity-check-ins")
@RequiredArgsConstructor
@Tag(name = "后台-活动签到管理")
public class AdminActivityCheckInController {

    private final ActivityCheckInService activityCheckInService;

    @GetMapping
    @Operation(summary = "签到列表(按活动ID)")
    public R<List<ActivityCheckIn>> listByActivityId(@RequestParam Long activityId) {
        return R.ok(activityCheckInService.listByActivityId(activityId));
    }

    @PostMapping("/verify")
    @Operation(summary = "验证签到")
    public R<ActivityCheckIn> verifyCheckIn(@RequestParam Long checkInId,
                                             @RequestParam String verifyMethod,
                                             @RequestParam Long verifiedBy) {
        return R.ok(activityCheckInService.verifyCheckIn(checkInId, verifyMethod, verifiedBy));
    }

    @GetMapping("/{activityId}/stats")
    @Operation(summary = "活动签到统计")
    public R<Map<String, Object>> getActivityStats(@PathVariable Long activityId) {
        return R.ok(activityCheckInService.getActivityStats(activityId));
    }
}
