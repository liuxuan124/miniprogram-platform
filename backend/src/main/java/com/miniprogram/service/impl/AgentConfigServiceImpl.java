package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.AgentConfigDTO;
import com.miniprogram.dto.AgentConfigVO;
import com.miniprogram.entity.AgentConfig;
import com.miniprogram.entity.AgentKnowledge;
import com.miniprogram.entity.AgentVersion;
import com.miniprogram.entity.AiConversation;
import com.miniprogram.entity.Product;
import com.miniprogram.mapper.AgentConfigMapper;
import com.miniprogram.mapper.AgentKnowledgeMapper;
import com.miniprogram.mapper.AgentVersionMapper;
import com.miniprogram.mapper.AiConversationMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.service.AgentConfigService;
import com.miniprogram.service.FileUploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgentConfigServiceImpl extends BaseServiceImpl<AgentConfigMapper, AgentConfig> implements AgentConfigService {

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private final AgentKnowledgeMapper agentKnowledgeMapper;
    private final AgentVersionMapper agentVersionMapper;
    private final AiConversationMapper aiConversationMapper;
    private final ProductMapper productMapper;
    private final FileUploadService fileUploadService;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public PageResult<AgentConfigVO> listConfigs(String keyword, Long current, Long size) {
        try {
        LambdaQueryWrapper<AgentConfig> wrapper = new LambdaQueryWrapper<>();
        wrapper.like(StringUtils.hasText(keyword), AgentConfig::getName, keyword);
        wrapper.orderByDesc(AgentConfig::getUpdatedAt);

        Page<AgentConfig> page = this.page(new Page<>(current, size), wrapper);

        PageResult<AgentConfigVO> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setCurrent(page.getCurrent());
        result.setSize(page.getSize());
        result.setRecords(page.getRecords().stream().map(this::toVO).toList());
        return result;
        } catch (Exception e) {
            log.warn("listConfigs failed (check V35 migration): {}", e.getMessage());
            PageResult<AgentConfigVO> empty = new PageResult<>();
            empty.setTotal(0L);
            empty.setCurrent(current);
            empty.setSize(size);
            empty.setRecords(List.of());
            return empty;
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AgentConfigVO createConfig(AgentConfigDTO dto) {
        AgentConfig config = new AgentConfig();
        applyDto(config, dto, true);
        if (config.getStatus() == null) {
            config.setStatus(0);
        }
        if (config.getVersion() == null) {
        config.setVersion(1);
        }
        LocalDateTime now = LocalDateTime.now();
        config.setCreatedAt(now);
        config.setUpdatedAt(now);
        this.save(config);
        return toVO(config);
    }

    @Override
    public AgentConfigVO getConfigDetail(Long id) {
        return toVO(getExistingConfig(id));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AgentConfigVO updateConfig(Long id, AgentConfigDTO dto) {
        AgentConfig config = getExistingConfig(id);
        applyDto(config, dto, false);
        config.setUpdatedAt(LocalDateTime.now());
        this.updateById(config);
        return toVO(config);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteConfig(Long id) {
        getExistingConfig(id);
        this.removeById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AgentConfigVO publishConfig(Long id) {
        AgentConfig config = getExistingConfig(id);
        if (!StringUtils.hasText(config.getModel()) || !StringUtils.hasText(config.getModelProvider())) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "请先完善模型与提供商后再发布");
        }

        // 其它配置全部下线
        this.update(new LambdaUpdateWrapper<AgentConfig>()
                .ne(AgentConfig::getId, id)
                .eq(AgentConfig::getStatus, 1)
                .set(AgentConfig::getStatus, 0));

        int nextVersion;
        AgentVersion latestSnap = agentVersionMapper.selectOne(new LambdaQueryWrapper<AgentVersion>()
                .orderByDesc(AgentVersion::getVersion)
                .last("LIMIT 1"));
        if (latestSnap != null && latestSnap.getVersion() != null) {
            nextVersion = latestSnap.getVersion() + 1;
        } else if (config.getStatus() != null && config.getStatus() == 1 && config.getVersion() != null) {
            nextVersion = config.getVersion() + 1;
        } else {
            nextVersion = config.getVersion() == null || config.getVersion() < 1 ? 1 : config.getVersion();
        }
        config.setStatus(1);
        config.setVersion(nextVersion);
        config.setUpdatedAt(LocalDateTime.now());
        this.updateById(config);

        // 旧发布版本标记回滚态，写入新快照
        agentVersionMapper.update(null, new LambdaUpdateWrapper<AgentVersion>()
                .eq(AgentVersion::getStatus, 1)
                .set(AgentVersion::getStatus, 2));

        AgentVersion snapshot = new AgentVersion();
        snapshot.setVersion(nextVersion);
        snapshot.setConfigJson(toJson(toVO(config)));
        snapshot.setChangelog("发布配置 " + (config.getName() != null ? config.getName() : ("#" + id)));
        snapshot.setStatus(1);
        snapshot.setCreatedAt(LocalDateTime.now());
        agentVersionMapper.insert(snapshot);

        return toVO(config);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AgentConfigVO rollbackToVersion(Integer version) {
        if (version == null) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "版本号不能为空");
        }
        AgentVersion snap = agentVersionMapper.selectOne(new LambdaQueryWrapper<AgentVersion>()
                .eq(AgentVersion::getVersion, version)
                .last("LIMIT 1"));
        if (snap == null || !StringUtils.hasText(snap.getConfigJson())) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "版本快照不存在");
        }
        AgentConfigVO vo;
        try {
            vo = objectMapper.readValue(snap.getConfigJson(), AgentConfigVO.class);
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "版本快照解析失败");
        }
        if (vo.getId() == null) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "版本快照缺少配置 ID");
        }
        AgentConfig config = getExistingConfig(vo.getId());
        config.setName(vo.getName());
        config.setModel(vo.getModel());
        config.setModelProvider(vo.getModelProvider());
        config.setApiBaseUrl(vo.getApiBaseUrl());
        if (StringUtils.hasText(vo.getApiKey())) {
            config.setApiKey(vo.getApiKey());
        }
        config.setSystemPrompt(vo.getSystemPrompt());
        config.setTemperature(vo.getTemperature());
        config.setMaxTokens(vo.getMaxTokens());
        config.setReasoningEffort(vo.getReasoningEffort());
        config.setWelcomeMessage(vo.getWelcomeMessage());
        config.setFallbackStrategy(vo.getFallbackStrategy());
        config.setEnableRecommend(boolToInt(vo.getEnableRecommend()));
        config.setEnableProactive(boolToInt(vo.getEnableProactive()));
        config.setMemoryType(vo.getMemoryType());
        config.setUpdatedAt(LocalDateTime.now());
        this.updateById(config);
        return publishConfig(config.getId());
    }

    @Override
    public AgentConfigVO getActiveConfig() {
        try {
            AgentConfig config = this.lambdaQuery()
                    .eq(AgentConfig::getStatus, 1)
                    .orderByDesc(AgentConfig::getVersion)
                    .last("LIMIT 1")
                    .one();
            return config == null ? null : toVO(config);
        } catch (Exception e) {
            log.warn("getActiveConfig failed (check V35 migration): {}", e.getMessage());
            return null;
        }
    }

    @Override
    public Map<String, Object> testConnection(AgentConfigDTO dto) {
        String baseUrl = trimSlash(dto.getApiBaseUrl());
        String apiKey = dto.getApiKey();
        String model = dto.getModel();
        if (!StringUtils.hasText(baseUrl) || !StringUtils.hasText(model)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "请先填写模型 ID 和 Base URL");
        }
        // 若未传 key，尝试用启用配置的 key
        if (!StringUtils.hasText(apiKey)) {
            AgentConfigVO active = getActiveConfig();
            if (active != null) {
                apiKey = active.getApiKey();
            }
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ok", false);
        result.put("model", model);
        result.put("baseUrl", baseUrl);
        if (!StringUtils.hasText(apiKey)) {
            result.put("message", "未提供 API Key，仅校验了地址与模型 ID 格式");
            result.put("ok", true);
            result.put("mode", "format_only");
            return result;
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(apiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, Object> body = new HashMap<>();
            body.put("model", model);
            body.put("messages", List.of(Map.of("role", "user", "content", "ping")));
            body.put("max_tokens", 8);
            ResponseEntity<String> resp = restTemplate.exchange(
                    baseUrl + "/chat/completions",
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    String.class
            );
            result.put("ok", resp.getStatusCode().is2xxSuccessful());
            result.put("status", resp.getStatusCode().value());
            result.put("mode", "live");
            result.put("message", resp.getStatusCode().is2xxSuccessful() ? "连接成功" : "连接失败");
        } catch (Exception e) {
            log.warn("Agent test connection failed: {}", e.getMessage());
            result.put("ok", false);
            result.put("mode", "live");
            result.put("message", "连接失败：" + e.getMessage());
        }
        return result;
    }

    @Override
    public Map<String, Object> sandboxChat(Map<String, Object> body) {
        String question = body == null ? null : String.valueOf(body.getOrDefault("question", "")).trim();
        if (!StringUtils.hasText(question) || "null".equals(question)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "问题不能为空");
        }
        try {
            return sandboxChatInternal(question, body);
        } catch (Exception e) {
            log.warn("sandboxChat fallback: {}", e.getMessage());
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("question", question);
            result.put("mode", "mock");
            result.put("answer", mockReply(question, false, false, "human", ""));
            result.put("hint", "沙盒服务异常，已使用本地模拟回复");
            return result;
        }
    }

    private Map<String, Object> sandboxChatInternal(String question, Map<String, Object> body) {
        AgentConfigVO published = getActiveConfig();
        boolean enableRecommend = resolveBool(body, "enableRecommend",
                published != null && Boolean.TRUE.equals(published.getEnableRecommend()));
        boolean enableProactive = resolveBool(body, "enableProactive",
                published != null && Boolean.TRUE.equals(published.getEnableProactive()));
        String fallback = firstText(body, "fallbackStrategy",
                published != null ? published.getFallbackStrategy() : "human");
        String systemPrompt = firstText(body, "systemPrompt",
                published != null ? published.getSystemPrompt() : null);
        String productCatalog = enableRecommend ? loadProductCatalog(3) : "";
        String policyPrompt = buildPolicyPrompt(enableRecommend, enableProactive, fallback, productCatalog);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("question", question);
        result.put("mode", "mock");
        result.put("enableRecommend", enableRecommend);

        boolean canCallModel = published != null
                && StringUtils.hasText(published.getApiKey())
                && StringUtils.hasText(published.getApiBaseUrl());
        if (!canCallModel) {
            result.put("answer", mockReply(question, enableRecommend, enableProactive, fallback, productCatalog));
            result.put("hint", enableRecommend
                    ? "未配置可用 API Key，已按当前策略模拟回复（商品推荐已开启）"
                    : "未配置可用 API Key，已按当前策略模拟回复（商品推荐已关闭）");
            return result;
        }

        try {
            String baseUrl = trimSlash(published.getApiBaseUrl());
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(published.getApiKey());
            headers.setContentType(MediaType.APPLICATION_JSON);
            List<Map<String, String>> messages = new ArrayList<>();
            StringBuilder sys = new StringBuilder();
            if (StringUtils.hasText(systemPrompt)) {
                sys.append(systemPrompt.trim());
            }
            if (StringUtils.hasText(policyPrompt)) {
                if (sys.length() > 0) {
                    sys.append("\n\n");
                }
                sys.append(policyPrompt);
            }
            if (sys.length() > 0) {
                messages.add(Map.of("role", "system", "content", sys.toString()));
            }
            messages.add(Map.of("role", "user", "content", question));
            Map<String, Object> req = new HashMap<>();
            req.put("model", published.getModel());
            req.put("messages", messages);
            req.put("temperature", published.getTemperature() != null ? published.getTemperature() : 0.7);
            req.put("max_tokens", published.getMaxTokens() != null ? Math.min(published.getMaxTokens(), 1024) : 512);
            ResponseEntity<String> resp = restTemplate.exchange(
                    baseUrl + "/chat/completions",
                    HttpMethod.POST,
                    new HttpEntity<>(req, headers),
                    String.class
            );
            String answer = extractChatContent(resp.getBody());
            result.put("answer", StringUtils.hasText(answer)
                    ? answer
                    : mockReply(question, enableRecommend, enableProactive, fallback, productCatalog));
            result.put("mode", "live");
        } catch (Exception e) {
            log.warn("Agent sandbox chat failed: {}", e.getMessage());
            result.put("answer", mockReply(question, enableRecommend, enableProactive, fallback, productCatalog));
            result.put("mode", "mock");
            result.put("hint", "模型调用失败，已回退模拟回复：" + e.getMessage());
        }
        return result;
    }

    @Override
    public List<AgentKnowledge> listKnowledge(Long configId) {
        // config_id 列可能尚未迁移，不做库内过滤
        return agentKnowledgeMapper.selectList(new LambdaQueryWrapper<AgentKnowledge>()
                .orderByDesc(AgentKnowledge::getCreatedAt));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AgentKnowledge addKnowledge(Map<String, Object> body) {
        String fileName = body == null ? null : String.valueOf(body.getOrDefault("fileName", "")).trim();
        String fileUrl = body == null ? null : String.valueOf(body.getOrDefault("fileUrl", "")).trim();
        if (!StringUtils.hasText(fileName) || "null".equals(fileName)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "文件名不能为空");
        }
        if (!StringUtils.hasText(fileUrl) || "null".equals(fileUrl)) {
            fileUrl = "local://" + fileName;
        }
        AgentKnowledge k = new AgentKnowledge();
        k.setFileName(fileName);
        Object size = body.get("fileSize");
        k.setFileSize(size == null ? 0L : Long.valueOf(String.valueOf(size)));
        k.setFileUrl(fileUrl);
        k.setVectorStatus("pending");
        Object weight = body.get("recallWeight");
        k.setRecallWeight(weight == null ? BigDecimal.ONE : new BigDecimal(String.valueOf(weight)));
        k.setCreatedAt(LocalDateTime.now());
        try {
            agentKnowledgeMapper.insert(k);
        } catch (Exception e) {
            log.error("insert agent knowledge failed: {}", e.getMessage(), e);
            throw new BusinessException(ErrorCode.PARAM_ERROR,
                    "知识库保存失败，请确认已执行 V25 迁移：" + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()));
        }
        return k;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AgentKnowledge uploadKnowledge(org.springframework.web.multipart.MultipartFile file, Long configId) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "请选择要上传的文件");
        }
        com.miniprogram.dto.system.UploadResultVO uploaded;
        try {
            // 使用单参数 upload，避免旧版 FileUploadService 没有子目录重载
            uploaded = fileUploadService.upload(file);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("agent knowledge file save failed: {}", e.getMessage(), e);
            throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED,
                    "文件保存失败：" + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()));
        }
        Map<String, Object> body = new HashMap<>();
        body.put("fileName", StringUtils.hasText(uploaded.getOriginalFileName())
                ? uploaded.getOriginalFileName()
                : file.getOriginalFilename());
        body.put("fileUrl", uploaded.getUrl());
        body.put("fileSize", uploaded.getFileSize() != null ? uploaded.getFileSize() : file.getSize());
        body.put("recallWeight", 1);
        return addKnowledge(body);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateKnowledgeWeight(Long id, Double weight) {
        AgentKnowledge k = agentKnowledgeMapper.selectById(id);
        if (k == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "知识库文件不存在");
        }
        k.setRecallWeight(BigDecimal.valueOf(weight == null ? 1.0 : weight));
        agentKnowledgeMapper.updateById(k);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteKnowledge(Long id) {
        if (agentKnowledgeMapper.selectById(id) == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "知识库文件不存在");
        }
        agentKnowledgeMapper.deleteById(id);
    }

    @Override
    public List<AgentVersion> listVersions() {
        return agentVersionMapper.selectList(new LambdaQueryWrapper<AgentVersion>()
                .orderByDesc(AgentVersion::getVersion));
    }

    @Override
    public List<Map<String, Object>> recentConversations(int limit) {
        int size = Math.min(Math.max(limit, 1), 50);
        List<AiConversation> list = aiConversationMapper.selectList(new LambdaQueryWrapper<AiConversation>()
                .eq(AiConversation::getDeleted, 0)
                .orderByDesc(AiConversation::getCreatedAt)
                .last("LIMIT " + size));
        List<Map<String, Object>> rows = new ArrayList<>();
        for (AiConversation c : list) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("user", "用户#" + (c.getUserId() == null ? "-" : c.getUserId()));
            row.put("question", truncate(c.getQuestion(), 40));
            row.put("answer", truncate(c.getAnswer(), 50));
            row.put("intent", c.getIsTransferHuman() != null && c.getIsTransferHuman() ? "转人工" : "对话");
            row.put("action", "-");
            row.put("time", c.getCreatedAt() == null ? "-" : c.getCreatedAt().format(TIME_FMT));
            rows.add(row);
        }
        return rows;
    }

    private void applyDto(AgentConfig config, AgentConfigDTO dto, boolean creating) {
        if (dto == null) {
            return;
        }
        if (StringUtils.hasText(dto.getName()) || creating) {
            config.setName(StringUtils.hasText(dto.getName()) ? dto.getName() : "未命名 Agent");
        }
        if (StringUtils.hasText(dto.getModel()) || creating) {
            config.setModel(dto.getModel());
        }
        if (StringUtils.hasText(dto.getModelProvider()) || creating) {
            config.setModelProvider(dto.getModelProvider());
        }
        if (dto.getApiBaseUrl() != null) {
            config.setApiBaseUrl(dto.getApiBaseUrl());
        }
        if (dto.getApiKey() != null) {
            config.setApiKey(dto.getApiKey());
        }
        if (dto.getSystemPrompt() != null) {
            config.setSystemPrompt(dto.getSystemPrompt());
        }
        if (dto.getTemperature() != null) {
            config.setTemperature(dto.getTemperature());
        }
        if (dto.getMaxTokens() != null) {
            config.setMaxTokens(dto.getMaxTokens());
        }
        if (dto.getReasoningEffort() != null) {
            config.setReasoningEffort(dto.getReasoningEffort());
        }
        if (dto.getWelcomeMessage() != null) {
            config.setWelcomeMessage(dto.getWelcomeMessage());
        }
        if (dto.getFallbackStrategy() != null) {
            config.setFallbackStrategy(dto.getFallbackStrategy());
        }
        if (dto.getEnableRecommend() != null) {
            config.setEnableRecommend(boolToInt(dto.getEnableRecommend()));
        }
        if (dto.getEnableProactive() != null) {
            config.setEnableProactive(boolToInt(dto.getEnableProactive()));
        }
        if (dto.getMemoryType() != null) {
            config.setMemoryType(dto.getMemoryType());
        }
    }

    private AgentConfig getExistingConfig(Long id) {
        AgentConfig config = this.getById(id);
        if (config == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "配置不存在");
        }
        return config;
    }

    private AgentConfigVO toVO(AgentConfig config) {
        AgentConfigVO vo = new AgentConfigVO();
        BeanUtils.copyProperties(config, vo);
        vo.setEnableRecommend(intToBool(config.getEnableRecommend()));
        vo.setEnableProactive(intToBool(config.getEnableProactive()));
        return vo;
    }

    private Integer boolToInt(Boolean value) {
        if (value == null) {
            return null;
        }
        return value ? 1 : 0;
    }

    private Boolean intToBool(Integer value) {
        return value != null && value == 1;
    }

    private String trimSlash(String url) {
        if (!StringUtils.hasText(url)) {
            return url;
        }
        String u = url.trim();
        while (u.endsWith("/")) {
            u = u.substring(0, u.length() - 1);
        }
        return u;
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }

    private String extractChatContent(String body) {
        if (!StringUtils.hasText(body)) {
            return null;
        }
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            return content.isMissingNode() ? null : content.asText();
        } catch (Exception e) {
            return null;
        }
    }

    private String truncate(String text, int max) {
        if (!StringUtils.hasText(text)) {
            return "-";
        }
        return text.length() <= max ? text : text.substring(0, max) + "...";
    }

    private String mockReply(String question, boolean enableRecommend, boolean enableProactive,
                             String fallback, String productCatalog) {
        String q = question.toLowerCase();
        if (q.contains("会员") || q.contains("金卡") || q.contains("积分")) {
            String text = "👑 金卡会员可享受积分加速、专属折扣和活动优先报名。建议先查看会员中心的等级规则。";
            return appendProactive(text, enableProactive, "需要的话我可以按您当前积分说明升级路径。");
        }
        if (q.contains("优惠") || q.contains("券") || q.contains("折扣")) {
            return "🎟️ 当前可用优惠以结算页可领取券为准。";
        }
        if (q.contains("活动") || q.contains("预约") || q.contains("报名")) {
            String text = "🎪 近期有活动报名与预约服务，建议先确认日期和名额再报名。";
            return appendProactive(text, enableProactive, "需要我帮您看最适合新手的场次吗？");
        }
        if (q.contains("礼物") || q.contains("推荐") || q.contains("商品") || q.contains("买")) {
            if (!enableRecommend) {
                return "当前已关闭商品推荐。我可以解答规则、活动或会员问题；选购请到商品页自行浏览。"
                        + fallbackHint(fallback);
            }
            if (StringUtils.hasText(productCatalog)) {
                return "🛍️ 按当前在售商品，可参考：\n" + productCatalog
                        + (enableProactive ? "\n告诉我预算或用途，我再帮您缩小范围。" : "");
            }
            return "🛍️ 商品推荐已开启，但暂无在售商品可引用。";
        }
        if (q.contains("不知道") || q.contains("随便") || q.length() <= 2) {
            return fallbackHint(fallback);
        }
        String base = "✅ 已收到您的问题。请补充用途或目标人群，我可以给出更准确的说明。";
        if (enableRecommend && StringUtils.hasText(productCatalog) && enableProactive) {
            return base + "\n如果您在找商品，当前可参考：\n" + productCatalog;
        }
        return base;
    }

    private String appendProactive(String text, boolean enableProactive, String followUp) {
        return enableProactive ? text + "\n" + followUp : text;
    }

    private String fallbackHint(String fallback) {
        if ("message".equals(fallback)) {
            return "这个问题我暂时无法确认，建议您留言，我们会尽快回复。";
        }
        if ("generic".equals(fallback)) {
            return "抱歉，我暂时无法给出准确答案。您可以换个问法，或查看帮助中心。";
        }
        return "这个问题建议转接人工客服处理。";
    }

    private String buildPolicyPrompt(boolean enableRecommend, boolean enableProactive,
                                     String fallback, String productCatalog) {
        StringBuilder sb = new StringBuilder();
        sb.append("【行为策略，必须遵守】\n");
        if (enableRecommend) {
            sb.append("- 商品推荐：已开启。仅可从下方清单推荐真实在售商品，不得编造名称或价格。\n");
            if (StringUtils.hasText(productCatalog)) {
                sb.append("- 可推荐商品：\n").append(productCatalog).append("\n");
            } else {
                sb.append("- 当前没有可引用的在售商品，请说明暂无可推荐商品。\n");
            }
        } else {
            sb.append("- 商品推荐：已关闭。不得推荐任何具体商品、礼盒或加购引导。\n");
        }
        if (enableProactive) {
            sb.append("- 主动引导：已开启。可在回答末尾追问下一步（报名/咨询），但不得绕过商品推荐开关。\n");
        } else {
            sb.append("- 主动引导：已关闭。只回答当前问题，不要追加推销或下一步邀请。\n");
        }
        sb.append("- 无法回答时：").append(fallbackHint(fallback));
        return sb.toString();
    }

    private String loadProductCatalog(int limit) {
        try {
            List<Product> products = productMapper.selectList(new LambdaQueryWrapper<Product>()
                    .eq(Product::getStatus, "on_sale")
                    .orderByDesc(Product::getSales)
                    .last("LIMIT " + Math.max(1, Math.min(limit, 5))));
            if (products == null || products.isEmpty()) {
                return "";
            }
            StringBuilder sb = new StringBuilder();
            for (Product p : products) {
                sb.append("  - ").append(p.getName() != null ? p.getName() : ("商品#" + p.getId()));
                if (p.getPrice() != null) {
                    sb.append(" ¥").append(p.getPrice().stripTrailingZeros().toPlainString());
                }
                sb.append("\n");
            }
            return sb.toString().trim();
        } catch (Exception e) {
            log.warn("load product catalog failed: {}", e.getMessage());
            return "";
        }
    }

    private boolean resolveBool(Map<String, Object> body, String key, boolean fallback) {
        if (body == null || body.get(key) == null) {
            return fallback;
        }
        Object v = body.get(key);
        if (v instanceof Boolean b) {
            return b;
        }
        return "true".equalsIgnoreCase(String.valueOf(v)) || "1".equals(String.valueOf(v));
    }

    private String firstText(Map<String, Object> body, String key, String fallback) {
        if (body != null && body.get(key) != null) {
            String text = String.valueOf(body.get(key)).trim();
            if (StringUtils.hasText(text) && !"null".equals(text)) {
                return text;
            }
        }
        return fallback;
    }
}
