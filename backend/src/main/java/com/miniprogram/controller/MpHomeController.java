package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.home.WarmHomeVO;
import com.miniprogram.service.WarmHomeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 小程序端：暖阁首页聚合
 */
@Tag(name = "小程序-暖阁首页")
@RestController
@RequestMapping("/api/v1/mp/home")
@RequiredArgsConstructor
public class MpHomeController {

    private final WarmHomeService warmHomeService;

    @Operation(summary = "暖阁原生首页聚合数据")
    @GetMapping("/warm")
    public R<WarmHomeVO> warmHome() {
        return R.ok(warmHomeService.getWarmHome());
    }
}
