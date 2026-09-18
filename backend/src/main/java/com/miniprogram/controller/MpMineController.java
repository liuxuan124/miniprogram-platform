package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.mine.MineOverviewVO;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.MineOverviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "小程序-我的")
@RestController
@RequestMapping("/api/v1/mp/mine")
@RequiredArgsConstructor
public class MpMineController {

    private final MineOverviewService mineOverviewService;

    @Operation(summary = "当前用户「我的」页数据（必须登录，按 token 身份隔离）")
    @GetMapping("/overview")
    public R<MineOverviewVO> overview() {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        return R.ok(mineOverviewService.getOverview(userId));
    }
}
