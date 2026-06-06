package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.member.PointsLogQueryDTO;
import com.miniprogram.dto.member.PointsLogVO;
import com.miniprogram.service.MemberPointsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 后台-会员积分管理
 */
@RestController
@RequestMapping("/api/v1/admin/member-points")
@RequiredArgsConstructor
@Tag(name = "后台-会员积分管理")
public class AdminMemberPointsController {

    private final MemberPointsService memberPointsService;

    @GetMapping
    @Operation(summary = "积分日志列表")
    public R<PageResult<PointsLogVO>> listPointsLog(PointsLogQueryDTO queryDTO) {
        return R.ok(memberPointsService.listPointsLog(queryDTO));
    }

    @PostMapping
    @Operation(summary = "管理员调整积分")
    public R<Void> adjustPoints(@RequestBody Map<String, Object> body) {
        Long userId = getLong(body, "userId", "user_id");
        Integer points = getInteger(body, "points");
        String remark = String.valueOf(body.getOrDefault("remark", body.getOrDefault("description", "后台调整积分")));
        memberPointsService.adminAdjustPoints(userId, points, remark);
        return R.ok(null);
    }

    private Long getLong(Map<String, Object> body, String... keys) {
        for (String key : keys) {
            Object value = body.get(key);
            if (value instanceof Number number) {
                return number.longValue();
            }
            if (value instanceof String text && !text.isBlank()) {
                return Long.parseLong(text);
            }
        }
        throw new IllegalArgumentException("userId不能为空");
    }

    private Integer getInteger(Map<String, Object> body, String key) {
        Object value = body.get(key);
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            return Integer.parseInt(text);
        }
        throw new IllegalArgumentException("points不能为空");
    }
}
