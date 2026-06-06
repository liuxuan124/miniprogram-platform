package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.AgentConfigDTO;
import com.miniprogram.dto.AgentConfigVO;
import com.miniprogram.service.AgentConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 后台-AI Agent 配置管理
 */
@RestController
@RequestMapping("/api/v1/admin/agent")
@RequiredArgsConstructor
@Tag(name = "后台-AI Agent配置管理")
public class AdminAgentController {

    private final AgentConfigService agentConfigService;

    @GetMapping
    @Operation(summary = "配置列表")
    public R<PageResult<AgentConfigVO>> listConfigs(@RequestParam(required = false) String keyword,
                                                     @RequestParam(defaultValue = "1") Long current,
                                                     @RequestParam(defaultValue = "10") Long size) {
        return R.ok(agentConfigService.listConfigs(keyword, current, size));
    }

    @GetMapping("/{id}")
    @Operation(summary = "配置详情")
    public R<AgentConfigVO> getConfigDetail(@PathVariable Long id) {
        return R.ok(agentConfigService.getConfigDetail(id));
    }

    @PostMapping
    @Operation(summary = "创建配置")
    public R<AgentConfigVO> createConfig(@Valid @RequestBody AgentConfigDTO dto) {
        return R.ok(agentConfigService.createConfig(dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新配置")
    public R<AgentConfigVO> updateConfig(@PathVariable Long id, @Valid @RequestBody AgentConfigDTO dto) {
        return R.ok(agentConfigService.updateConfig(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除配置")
    public R<Void> deleteConfig(@PathVariable Long id) {
        agentConfigService.deleteConfig(id);
        return R.ok(null);
    }

    @PutMapping("/{id}/publish")
    @Operation(summary = "发布配置")
    public R<AgentConfigVO> publishConfig(@PathVariable Long id) {
        return R.ok(agentConfigService.publishConfig(id));
    }

    @GetMapping("/active")
    @Operation(summary = "当前启用配置")
    public R<AgentConfigVO> getActiveConfig() {
        return R.ok(agentConfigService.getActiveConfig());
    }
}
