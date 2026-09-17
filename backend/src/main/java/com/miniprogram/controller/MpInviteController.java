package com.miniprogram.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.R;
import com.miniprogram.entity.InviteScene;
import com.miniprogram.mapper.InviteSceneMapper;
import com.miniprogram.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/mp/invite")
@RequiredArgsConstructor
@Tag(name = "小程序-邀请短码")
public class MpInviteController {

    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final InviteSceneMapper inviteSceneMapper;

    @PostMapping("/scene")
    @Operation(summary = "创建邀请短码")
    public R<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(401001, "请先登录");
        }
        String targetType = body != null && body.get("targetType") != null
                ? String.valueOf(body.get("targetType")) : "page";
        String targetId = body != null && body.get("targetId") != null
                ? String.valueOf(body.get("targetId")) : "";

        String code = null;
        for (int i = 0; i < 8; i++) {
            String candidate = randomCode(6);
            Long exists = inviteSceneMapper.selectCount(new LambdaQueryWrapper<InviteScene>()
                    .eq(InviteScene::getShortCode, candidate));
            if (exists == null || exists == 0) {
                code = candidate;
                break;
            }
        }
        if (!StringUtils.hasText(code)) {
            throw new BusinessException(500001, "短码生成失败，请重试");
        }

        InviteScene row = new InviteScene();
        row.setShortCode(code);
        row.setInviterId(userId);
        row.setTargetType(targetType);
        row.setTargetId(targetId);
        row.setCreatedAt(LocalDateTime.now());
        inviteSceneMapper.insert(row);

        Map<String, Object> vo = new HashMap<>();
        vo.put("shortCode", code);
        vo.put("inviterId", userId);
        vo.put("targetType", targetType);
        vo.put("targetId", targetId);
        vo.put("path", "/pages/share/share?code=" + code);
        return R.ok(vo);
    }

    @GetMapping("/scene/{code}")
    @Operation(summary = "解析邀请短码")
    public R<Map<String, Object>> resolve(@PathVariable String code) {
        if (!StringUtils.hasText(code)) {
            throw new BusinessException(400001, "短码无效");
        }
        InviteScene row = inviteSceneMapper.selectOne(new LambdaQueryWrapper<InviteScene>()
                .eq(InviteScene::getShortCode, code.trim().toUpperCase())
                .last("LIMIT 1"));
        if (row == null) {
            throw new BusinessException(404001, "邀请码不存在");
        }
        Map<String, Object> vo = new HashMap<>();
        vo.put("shortCode", row.getShortCode());
        vo.put("inviterId", row.getInviterId());
        vo.put("targetType", row.getTargetType());
        vo.put("targetId", row.getTargetId());
        return R.ok(vo);
    }

    private static String randomCode(int len) {
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }
}
