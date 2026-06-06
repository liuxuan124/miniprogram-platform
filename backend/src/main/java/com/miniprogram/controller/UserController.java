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
 * 小程序用户管理控制器
 */
@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@Tag(name = "管理后台-小程序用户", description = "小程序用户列表和详情查询")
public class UserController {

    private final MiniProgramUserService miniProgramUserService;

    @GetMapping
    @Operation(summary = "小程序用户列表", description = "分页查询小程序用户列表")
    public R<PageResult<MiniProgramUserVO>> list(MiniProgramUserQueryDTO queryDTO) {
        return R.ok(miniProgramUserService.listUsers(queryDTO));
    }

    @GetMapping("/{id}")
    @Operation(summary = "用户详情", description = "获取小程序用户画像")
    public R<MiniProgramUserVO> detail(@PathVariable Long id) {
        return R.ok(miniProgramUserService.getUserProfile(id));
    }
}
