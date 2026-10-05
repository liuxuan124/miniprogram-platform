package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.entity.GroupQrcode;
import com.miniprogram.service.GroupQrcodeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

@Tag(name = "小程序-群码")
@RestController
@RequestMapping("/api/v1/mp/group-qrcode")
@RequiredArgsConstructor
@Validated
public class MpGroupQrcodeController {

    private final GroupQrcodeService service;

    @Operation(summary = "取某群当前有效二维码")
    @GetMapping
    public R<GroupQrcode> getCurrent(@RequestParam String groupKey) {
        return R.ok(service.getCurrentQrcode(groupKey));
    }

    /**
     * 批量取码：加群组件一次请求拿回页面上所有群的有效码，避免 N 次往返。
     * groupKeys 逗号分隔；无有效码的群不会出现在结果里，调用方据此回落到装修器内联二维码。
     *
     * <p>2026-10-05 加 {@code @Size(max = 50)}：本接口匿名开放（原因为装修页在未登录态
     * 也要渲染活码），若不限制参数长度，单请求可塞数千 key 放大成数千次查询，
     * 限流按请求数计拦不住。service 侧 {@code GroupQrcodeServiceImpl.MAX_BATCH_KEYS} 再兜一层。
     */
    @Operation(summary = "批量取多群当前有效二维码")
    @GetMapping("/batch")
    public R<Map<String, GroupQrcode>> getCurrentBatch(
            @RequestParam @Size(min = 1, max = 1000,
                    message = "groupKeys 逗号拼接后总长度不能超过 1000 个字符")
            @NotBlank(message = "groupKeys 不能为空")
            String groupKeys) {
        return R.ok(service.getCurrentQrcodes(
                Arrays.stream(groupKeys.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toList())));
    }
}