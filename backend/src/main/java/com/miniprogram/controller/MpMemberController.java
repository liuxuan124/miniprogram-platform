package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.member.MemberInfoVO;
import com.miniprogram.dto.member.PointsLogQueryDTO;
import com.miniprogram.dto.member.PointsLogVO;
import com.miniprogram.dto.member.SignInVO;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.MemberPointsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 小程序端-会员积分接口。
 */
@RestController
@RequestMapping("/api/v1/mp/member")
@RequiredArgsConstructor
@Tag(name = "小程序端-会员积分接口")
public class MpMemberController {

    private final MemberPointsService memberPointsService;

    @GetMapping("/info")
    @Operation(summary = "会员信息")
    public R<MemberInfoVO> getMemberInfo() {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        return R.ok(memberPointsService.getMemberInfo(userId));
    }

    @GetMapping("/points-log")
    @Operation(summary = "我的积分记录")
    public R<PageResult<PointsLogVO>> listPointsLog(PointsLogQueryDTO query) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        return R.ok(memberPointsService.listUserPointsLog(userId, query));
    }

    @PostMapping("/sign-in")
    @Operation(summary = "每日签到")
    public R<SignInVO> signIn() {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        return R.ok(memberPointsService.signIn(userId));
    }

    @GetMapping("/sign-in/status")
    @Operation(summary = "签到状态")
    public R<Map<String, Object>> getSignInStatus() {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        MemberInfoVO memberInfo = memberPointsService.getMemberInfo(userId);
        return R.ok(Map.of(
                "todaySigned", memberInfo.getTodaySigned(),
                "streak", memberInfo.getContinuousSignDays()
        ));
    }
}
