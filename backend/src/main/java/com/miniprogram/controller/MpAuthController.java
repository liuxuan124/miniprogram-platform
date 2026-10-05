package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.WxLoginDTO;
import com.miniprogram.dto.WxLoginVO;
import com.miniprogram.dto.WxPhoneDTO;
import com.miniprogram.dto.WxPhoneBindVO;
import com.miniprogram.dto.WxProfileUpdateDTO;
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

    /**
     * 绑定手机号（老契约，返回裸 String —— 不要改返回类型）。
     *
     * <p>🔴 已发布的小程序版本把这里的返回值直接当 phone 存进持久化 userInfo，
     * 改成对象会让线上老版本把对象当手机号（显示 [object Object]）。
     * 合并信号改用响应头附带：老版本忽略，新版本读得到。
     */
    @PostMapping("/phone")
    @Operation(summary = "获取微信手机号（老契约，返回手机号字符串）",
            description = "通过微信手机号按钮获取的code绑定手机号，并可同步昵称头像。"
                    + "V119：服务端内部已做手机号幂等（该号已属于另一账号时自动并入），"
                    + "合并信号见响应头 X-Account-Merged / X-Account-User-Id")
    public R<String> bindPhone(@Valid @RequestBody WxPhoneDTO dto,
                               jakarta.servlet.http.HttpServletResponse response) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        WxPhoneBindVO vo = wxAuthService.bindPhoneV2(userId, dto.getCode(), dto.getNickname(), dto.getAvatarUrl());
        response.setHeader("X-Account-Merged", String.valueOf(Boolean.TRUE.equals(vo.getMerged())));
        response.setHeader("X-Account-User-Id", String.valueOf(vo.getUserId()));
        return R.ok(vo.getPhone());
    }

    /** V119 新契约：返回对象，含 merged 标记，端上据此决定是否重新登录换 token。 */
    @PostMapping("/phone/v2")
    @Operation(summary = "获取微信手机号（新契约，返回合并信号）",
            description = "merged=true 表示已并入同手机号既有账号，端上需重新 wxLogin 换取主账号 token")
    public R<WxPhoneBindVO> bindPhoneV2(@Valid @RequestBody WxPhoneDTO dto) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        return R.ok(wxAuthService.bindPhoneV2(userId, dto.getCode(), dto.getNickname(), dto.getAvatarUrl()));
    }

    @PutMapping("/profile")
    @Operation(summary = "更新资料", description = "更新昵称/头像；头像须为公网 URL，禁止 wxfile://")
    public R<Void> updateProfile(@RequestBody WxProfileUpdateDTO dto) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        wxAuthService.updateProfile(
                userId,
                dto == null ? null : dto.getNickname(),
                dto == null ? null : dto.getAvatarUrl());
        return R.ok();
    }
}
