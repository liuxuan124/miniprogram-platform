package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.MiniProgramUserQueryDTO;
import com.miniprogram.dto.MiniProgramUserVO;
import com.miniprogram.service.MiniProgramUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 契约路径别名：/api/v1/admin/members → 复用小程序用户列表（会员运营主数据源）
 */
@Tag(name = "会员管理（契约别名）", description = "对齐 api-contract §7.3 /admin/members")
@RestController
@RequestMapping("/api/v1/admin/members")
@RequiredArgsConstructor
public class AdminMemberController {

    private final MiniProgramUserService miniProgramUserService;

    @Operation(summary = "会员列表")
    @GetMapping
    public R<PageResult<MiniProgramUserVO>> list(MiniProgramUserQueryDTO queryDTO) {
        return R.ok(miniProgramUserService.listUsers(queryDTO));
    }

    @Operation(summary = "会员详情")
    @GetMapping("/{id}")
    public R<MiniProgramUserVO> detail(@PathVariable Long id) {
        return R.ok(miniProgramUserService.getUserProfile(id));
    }
}
