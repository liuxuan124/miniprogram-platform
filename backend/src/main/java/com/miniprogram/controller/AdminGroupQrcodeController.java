package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.entity.GroupQrcode;
import com.miniprogram.service.GroupQrcodeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "群码轮换管理")
@RestController
@RequestMapping("/api/v1/admin/group-qrcode")
@RequiredArgsConstructor
public class AdminGroupQrcodeController {

    private final GroupQrcodeService service;

    @Operation(summary = "列群码")
    @GetMapping
    public R<List<GroupQrcode>> list(@RequestParam(required = false) String groupKey) {
        return R.ok(service.listByGroup(groupKey));
    }

    @Operation(summary = "新增/更新群码")
    @PostMapping
    public R<GroupQrcode> save(@RequestBody GroupQrcode row) {
        return R.ok(service.save(row));
    }

    @Operation(summary = "删除群码")
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return R.ok();
    }
}