package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.entity.Channel;
import com.miniprogram.service.ChannelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Tag(name = "渠道分享归因管理")
@RestController
@RequestMapping("/api/v1/admin/channel")
@RequiredArgsConstructor
public class AdminChannelController {

    private final ChannelService service;

    @Operation(summary = "渠道列表")
    @GetMapping
    public R<List<Channel>> list(@RequestParam(required = false) Integer status) {
        return R.ok(service.listAll(status));
    }

    @Operation(summary = "新增/更新渠道")
    @PostMapping
    public R<Channel> save(@RequestBody Channel row) {
        return R.ok(service.save(row));
    }

    @Operation(summary = "删除渠道")
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return R.ok();
    }

    @Operation(summary = "渠道归因报表")
    @GetMapping("/report")
    public R<List<Map<String, Object>>> report(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(required = false) Long channelId) {
        return R.ok(service.report(from, to, channelId));
    }
}