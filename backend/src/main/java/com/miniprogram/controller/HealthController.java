package com.miniprogram.controller;

import com.miniprogram.common.R;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 健康检查控制器
 */
@Tag(name = "健康检查", description = "系统健康状态检查接口")
@RestController
@RequestMapping("/api/health")
public class HealthController {

    @Operation(summary = "健康检查", description = "检查系统是否正常运行")
    @GetMapping
    public R<Map<String, Object>> health() {
        Map<String, Object> result = new HashMap<>();
        result.put("status", "UP");
        result.put("timestamp", LocalDateTime.now());
        result.put("service", "mini-program-platform");
        result.put("version", "1.0.0");
        return R.ok(result);
    }
}
