package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.AgentConfigDTO;
import com.miniprogram.dto.AgentConfigVO;
import com.miniprogram.entity.AgentConfig;
import com.miniprogram.entity.AgentKnowledge;
import com.miniprogram.entity.AgentVersion;

import java.util.List;
import java.util.Map;

public interface AgentConfigService extends BaseService<AgentConfig> {

    PageResult<AgentConfigVO> listConfigs(String keyword, String role, Long current, Long size);

    AgentConfigVO createConfig(AgentConfigDTO dto);

    AgentConfigVO getConfigDetail(Long id);

    AgentConfigVO updateConfig(Long id, AgentConfigDTO dto);

    void deleteConfig(Long id);

    AgentConfigVO publishConfig(Long id);

    AgentConfigVO rollbackToVersion(Integer version);

    AgentConfigVO getActiveConfig();

    AgentConfigVO getActiveConfigByRole(String role);

    List<Map<String, Object>> listRoles();

    Map<String, Object> costStats(String role);

    /** 内容 Agent 专用：返回 answer + mode + estimatedTokens */
    Map<String, Object> chatForRole(String role, String systemPrompt, String userPrompt, Integer maxTokens);

    Map<String, Object> testConnection(AgentConfigDTO dto);

    Map<String, Object> sandboxChat(Map<String, Object> body);

    List<AgentKnowledge> listKnowledge(Long configId);

    AgentKnowledge addKnowledge(Map<String, Object> body);

    AgentKnowledge uploadKnowledge(org.springframework.web.multipart.MultipartFile file, Long configId);

    void updateKnowledgeWeight(Long id, Double weight);

    void deleteKnowledge(Long id);

    List<AgentVersion> listVersions();

    List<Map<String, Object>> recentConversations(int limit);
}
