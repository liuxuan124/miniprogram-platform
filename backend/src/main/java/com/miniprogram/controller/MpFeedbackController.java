package com.miniprogram.controller;

import com.miniprogram.common.BusinessException;
import com.miniprogram.common.R;
import com.miniprogram.entity.UserFeedback;
import com.miniprogram.mapper.UserFeedbackMapper;
import com.miniprogram.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@Tag(name = "小程序-意见反馈")
@RestController
@RequestMapping("/api/v1/mp/feedback")
@RequiredArgsConstructor
public class MpFeedbackController {

    private final UserFeedbackMapper userFeedbackMapper;

    @PostMapping
    @Operation(summary = "提交意见反馈（登录后写入服务端）")
    public R<Map<String, Object>> submit(@RequestBody Map<String, Object> body) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        String category = body != null && body.get("category") != null
                ? String.valueOf(body.get("category")).trim()
                : "其他";
        String content = body != null && body.get("content") != null
                ? String.valueOf(body.get("content")).trim()
                : "";
        if (!StringUtils.hasText(content)) {
            throw new BusinessException(400, "请填写反馈内容");
        }
        if (content.length() > 1000) {
            throw new BusinessException(400, "反馈内容过长");
        }
        if (category.length() > 32) {
            category = category.substring(0, 32);
        }
        UserFeedback row = new UserFeedback();
        row.setUserId(userId);
        row.setCategory(category);
        row.setContent(content);
        row.setStatus("pending");
        row.setCreatedAt(LocalDateTime.now());
        userFeedbackMapper.insert(row);
        return R.ok(Map.of("id", row.getId()));
    }
}
