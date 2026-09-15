package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.entity.UserNotice;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.UserNoticeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/mp/notices")
@RequiredArgsConstructor
@Tag(name = "小程序端-站内通知")
public class MpNoticeController {

    private final UserNoticeService userNoticeService;

    @GetMapping
    @Operation(summary = "我的通知列表")
    public R<List<UserNotice>> list() {
        return R.ok(userNoticeService.list(SecurityUtils.getCurrentUserId()));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "未读数量")
    public R<Map<String, Long>> unreadCount() {
        return R.ok(Map.of("count", userNoticeService.unreadCount(SecurityUtils.getCurrentUserId())));
    }

    @PostMapping("/{id}/read")
    @Operation(summary = "标记已读")
    public R<Void> markRead(@PathVariable Long id) {
        userNoticeService.markRead(SecurityUtils.getCurrentUserId(), id);
        return R.ok(null);
    }

    @PostMapping("/read-all")
    @Operation(summary = "全部已读")
    public R<Void> markAllRead() {
        userNoticeService.markAllRead(SecurityUtils.getCurrentUserId());
        return R.ok(null);
    }
}
