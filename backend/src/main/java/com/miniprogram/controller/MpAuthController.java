package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.WxLoginDTO;
import com.miniprogram.dto.WxLoginVO;
import com.miniprogram.dto.WxPhoneDTO;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.WxAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 小程序认证控制器
 */
@RestController
@RequestMapping("/api/v1/mp/auth")
@RequiredArgsConstructor
@Tag(name = "小程序-认证", description = "微信登录、获取手机号等")
public class MpAuthController {

    private final WxAuthService wxAuthService;

    @PostMapping("/login")
    @Operation(summary = "微信小程序登录", description = "通过wx.login获取的code换取token")
    public R<WxLoginVO> login(@Valid @RequestBody WxLoginDTO dto) {
        return R.ok(wxAuthService.login(dto));
    }

    @PostMapping("/phone")
    @Operation(summary = "获取微信手机号", description = "通过微信手机号按钮获取的code绑定手机号")
    public R<String> bindPhone(@Valid @RequestBody WxPhoneDTO dto) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        String phone = wxAuthService.bindPhone(userId, dto.getCode());
        return R.ok(phone);
    }
}
