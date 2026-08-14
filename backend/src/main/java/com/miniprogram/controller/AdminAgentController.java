package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.AgentConfigDTO;
import com.miniprogram.dto.AgentConfigVO;
import com.miniprogram.entity.AgentKnowledge;
import com.miniprogram.entity.AgentVersion;
import com.miniprogram.service.AgentConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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

    /** 两段路径，避免被 /{id} 误匹配（含旧版路由） */
    @GetMapping("/meta/active")
    @Operation(summary = "当前启用配置")
    public R<AgentConfigVO> getActiveConfig() {
        return R.ok(agentConfigService.getActiveConfig());
    }

    @GetMapping("/meta/versions")
    @Operation(summary = "版本历史")
    public R<List<AgentVersion>> listVersions() {
        return R.ok(agentConfigService.listVersions());
    }

    @GetMapping("/meta/knowledge")
    @Operation(summary = "知识库列表")
    public R<List<AgentKnowledge>> listKnowledge(@RequestParam(required = false) Long configId) {
        return R.ok(agentConfigService.listKnowledge(configId));
    }

    @PostMapping("/meta/knowledge/upload")
    @Operation(summary = "上传知识库文件")
    public R<AgentKnowledge> uploadKnowledge(@RequestPart("file") org.springframework.web.multipart.MultipartFile file,
                                             @RequestParam(required = false) Long configId) {
        return R.ok(agentConfigService.uploadKnowledge(file, configId));
    }

    @PostMapping("/meta/knowledge")
    @Operation(summary = "登记知识库文件")
    public R<AgentKnowledge> addKnowledge(@RequestBody Map<String, Object> body) {
        return R.ok(agentConfigService.addKnowledge(body));
    }

    @PutMapping("/meta/knowledge/{id}/weight")
    @Operation(summary = "更新召回权重")
    public R<Void> updateKnowledgeWeightMeta(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Double weight = body == null || body.get("weight") == null
                ? null
                : Double.valueOf(String.valueOf(body.get("weight")));
        agentConfigService.updateKnowledgeWeight(id, weight);
        return R.ok(null);
    }

    @DeleteMapping("/meta/knowledge/{id}")
    @Operation(summary = "删除知识库文件")
    public R<Void> deleteKnowledgeMeta(@PathVariable Long id) {
        agentConfigService.deleteKnowledge(id);
        return R.ok(null);
    }

    @GetMapping("/meta/conversations")
    @Operation(summary = "最近对话（运营监控）")
    public R<List<Map<String, Object>>> recentConversations(@RequestParam(defaultValue = "20") int limit) {
        return R.ok(agentConfigService.recentConversations(limit));
    }

    /** 兼容旧前端路径 */
    @GetMapping("/active")
    @Operation(summary = "当前启用配置（兼容）")
    public R<AgentConfigVO> getActiveConfigLegacy() {
        return R.ok(agentConfigService.getActiveConfig());
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

    @PostMapping("/rollback")
    @Operation(summary = "回滚到指定版本")
    public R<AgentConfigVO> rollback(@RequestBody Map<String, Object> body) {
        Integer version = body == null || body.get("version") == null
                ? null
                : Integer.valueOf(String.valueOf(body.get("version")));
        return R.ok(agentConfigService.rollbackToVersion(version));
    }

    @PostMapping("/test-connection")
    @Operation(summary = "测试模型连接")
    public R<Map<String, Object>> testConnection(@RequestBody AgentConfigDTO dto) {
        return R.ok(agentConfigService.testConnection(dto));
    }

    @PostMapping("/sandbox/chat")
    @Operation(summary = "沙盒对话")
    public R<Map<String, Object>> sandboxChat(@RequestBody Map<String, Object> body) {
        return R.ok(agentConfigService.sandboxChat(body));
    }
}
