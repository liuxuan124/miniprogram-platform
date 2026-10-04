package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.entity.GroupQrcode;
import com.miniprogram.service.GroupQrcodeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name = "小程序-群码")
@RestController
@RequestMapping("/api/v1/mp/group-qrcode")
@RequiredArgsConstructor
public class MpGroupQrcodeController {

    private final GroupQrcodeService service;

    @Operation(summary = "取某群当前有效二维码")
    @GetMapping
    public R<GroupQrcode> getCurrent(@RequestParam String groupKey) {
        return R.ok(service.getCurrentQrcode(groupKey));
    }
}