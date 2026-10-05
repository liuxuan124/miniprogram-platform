package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.service.NoticeOpsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 运营中心 › 通知中心。
 *
 * <p>补齐的缺口：站内信此前只有系统自动写入（订单/客服/反馈/人群触达），
 * <b>运营没有任何入口</b> —— 不能主动发一条、不能查谁读了、不能按场景关掉。
 *
 * <p>路径走 {@code /api/v1/admin/ops/**}（只需登录），与私域引流 / 搜索运营 / 审核中心同一口径；
 * 不走 {@code /api/v1/admin/system/configs}，那条是 super_admin 专属，运营角色会 403。
 */
@Slf4j
@Tag(name = "运营中心-通知中心")
@RestController
@RequestMapping("/api/v1/admin/ops/notifications")
@RequiredArgsConstructor
public class AdminNotificationOpsController {

    private final NoticeOpsService noticeOpsService;

    @GetMapping("/stats")
    @Operation(summary = "通知概览统计")
    public R<Map<String, Object>> stats() {
        return R.ok(noticeOpsService.stats());
    }

    @PostMapping("/broadcast")
    @Operation(summary = "群发站内信")
    public R<Map<String, Object>> broadcast(@RequestBody Map<String, Object> body) {
        return R.ok(noticeOpsService.broadcast(body));
    }

    @GetMapping("/campaigns")
    @Operation(summary = "发送记录")
    public R<Map<String, Object>> campaigns(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {
        return R.ok(noticeOpsService.listCampaigns(current, size, status));
    }

    @GetMapping("/scenes")
    @Operation(summary = "站内信场景开关列表")
    public R<List<Map<String, Object>>> scenes() {
        return R.ok(noticeOpsService.listScenes());
    }

    @PutMapping("/scenes/{scene}")
    @Operation(summary = "开关某个通知场景")
    public R<Void> updateScene(@PathVariable String scene, @RequestParam boolean enabled) {
        noticeOpsService.updateScene(scene, enabled);
        return R.ok(null);
    }
}
