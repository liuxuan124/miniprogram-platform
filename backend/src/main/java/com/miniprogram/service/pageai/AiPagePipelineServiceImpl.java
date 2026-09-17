package com.miniprogram.service.pageai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.dto.AgentConfigVO;
import com.miniprogram.dto.PageCreateDTO;
import com.miniprogram.dto.PageDetailDTO;
import com.miniprogram.dto.PageDraftDTO;
import com.miniprogram.dto.pageai.AiPagePipelineDtos.DraftRef;
import com.miniprogram.dto.pageai.AiPagePipelineDtos.Request;
import com.miniprogram.dto.pageai.AiPagePipelineDtos.Result;
import com.miniprogram.dto.pageai.AiPagePipelineDtos.Stage;
import com.miniprogram.service.AgentConfigService;
import com.miniprogram.service.AiClientService;
import com.miniprogram.service.PageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiPagePipelineServiceImpl implements AiPagePipelineService {

    private static final String DESIGN_PROMPT = """
            你是小程序视觉设计师。按运营描述做「自由视觉/结构」方案，不要受现有搭建组件限制。
            只返回合法 JSON（不要 markdown）：
            {"page":{"name":"","background_color":"#f6f8fb","style_notes":""},"blocks":[{"id":"b1","intent":"区块意图（可自造类型名）","title":"","copy":"","visual":{"layout":"","style":"","interaction":""},"data_need":"goods|articles|activities|coupon|static|none","suggested_component":"","requested_fields":[],"requested_interactions":[],"requested_styles":[]}]}
            blocks 至少 4 个。允许出现现有组件没有的区块（如 3D/AR/直播/地图/视差首屏）。suggested_component 可空。
            """;

    private static final String COMPONENT_PROMPT = """
            你在做反向检查：对照「装修器真实组件」判断设计稿哪些能搭、缺什么、现有组件能力不够。
            只返回 JSON：{"mappings":[{"blockId":"b1","matchedType":"product_list 或空","status":"pass|incomplete|missing","gaps":["..."]}]}
            不要发明组件类型。下面是真实组件清单：
            """;

    private static final String API_PROMPT = """
            判断设计稿数据需求是否有对应真实接口。只返回 JSON：
            {"checks":[{"blockId":"b1","need":"goods","apiPath":"/api/v1/mp/products 或空","exists":true}]}
            不要编造路径。下面是仓库已注册的 /api/v1/mp 路径：
            """;

    private final AgentConfigService agentConfigService;
    private final AiClientService aiClientService;
    private final PageService pageService;
    private final MpEndpointIndex endpointIndex;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Result run(Request request) {
        String prompt = request == null || request.getPrompt() == null ? "" : request.getPrompt().trim();
        AiPagePipelineMatcher matcher = new AiPagePipelineMatcher(endpointIndex, objectMapper);

        Map<String, Object> design = AiPagePipelineMatcher.parseDesign(objectMapper, callLlm(DESIGN_PROMPT, "需求=" + (prompt.isBlank() ? "通用品牌首页" : prompt)));
        Stage designStage = stage("design", "设计 AI", "done", "规则稿（模型不可用）");
        if (design != null) {
            design.put("source", "llm");
            designStage.setNote("已生成自由视觉稿，未限定组件库");
        } else {
            design = AiPagePipelineMatcher.fallbackDesign(prompt);
        }

        callLlm(COMPONENT_PROMPT + "\n" + PageBuilderComponentCatalog.promptSummary(),
                "设计稿=" + matcher.toJson(design));
        Stage componentStage = stage("component", "组件检查", "done", "对照装修器注册表（确定性匹配）");

        List<String> mpPaths = endpointIndex.allPaths().stream()
                .filter(p -> p != null && p.contains("/api/v1/mp"))
                .limit(80)
                .collect(Collectors.toList());
        callLlm(API_PROMPT + "\n" + String.join("\n", mpPaths),
                "设计稿=" + matcher.toJson(design));
        Stage apiStage = stage("api", "接口检查", "done", "对照仓库已注册 /api/v1/mp 接口");

        List<AiPagePipelineMatcher.BlockMatch> matches = matcher.match(design);
        boolean hasDraft = matches.stream().anyMatch(AiPagePipelineMatcher.BlockMatch::inDraft);

        Result result = new Result();
        result.setLlmUsed("llm".equals(String.valueOf(design.get("source"))));
        result.setPageName(pageNameOf(design, prompt));
        result.setDesign(design);
        result.setReport(matches.stream().map(AiPagePipelineMatcher.BlockMatch::toRow).toList());

        Stage draftStage = stage("draft", "转草稿", "skipped", "没有可通过的区块，未建页");
        if (hasDraft) {
            DraftRef draft = commitDraft(result.getPageName(), design, matches, matcher);
            result.setDraft(draft);
            draftStage.setStatus("done");
            draftStage.setNote("已写入草稿「" + draft.getName() + "」，缺口仍留在报告");
        }
        result.setStages(List.of(designStage, componentStage, apiStage, draftStage));
        return result;
    }

    private DraftRef commitDraft(
            String pageName,
            Map<String, Object> design,
            List<AiPagePipelineMatcher.BlockMatch> matches,
            AiPagePipelineMatcher matcher
    ) {
        String slug = "ai-" + Long.toHexString(System.currentTimeMillis());
        PageCreateDTO create = new PageCreateDTO();
        create.setName(pageName.length() > 128 ? pageName.substring(0, 128) : pageName);
        create.setType(3);
        create.setPath("/pages/custom/" + slug);
        create.setDescription("AI 流水线草稿，缺口见生成报告");

        PageDetailDTO page = null;
        for (int i = 0; i < 8; i++) {
            try {
                create.setPath("/pages/custom/" + slug + (i == 0 ? "" : "-" + i));
                page = pageService.createPage(create);
                break;
            } catch (BusinessException e) {
                if (e.getCode() != 300203) {
                    throw e;
                }
            }
        }
        if (page == null || page.getId() == null) {
            throw new BusinessException(300201, "无法创建草稿页（路径冲突）");
        }

        Map<String, Object> dsl = matcher.buildDsl(
                design, matches, String.valueOf(page.getId()), page.getName(), page.getPath());
        PageDraftDTO draftDTO = new PageDraftDTO();
        draftDTO.setDslContent(matcher.toJson(dsl));
        pageService.saveDraft(page.getId(), draftDTO);

        DraftRef ref = new DraftRef();
        ref.setPageId(page.getId());
        ref.setName(page.getName());
        ref.setPath(page.getPath());
        ref.setComponentCount((int) matches.stream().filter(AiPagePipelineMatcher.BlockMatch::inDraft).count());
        return ref;
    }

    private String callLlm(String systemPrompt, String userPrompt) {
        try {
            AgentConfigVO active = agentConfigService.getActiveConfig();
            if (active != null && StringUtils.hasText(active.getApiKey())
                    && StringUtils.hasText(active.getApiBaseUrl())) {
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("question", userPrompt);
                body.put("systemPrompt", systemPrompt);
                body.put("enableRecommend", false);
                Map<String, Object> result = agentConfigService.sandboxChat(body);
                if (result != null && "live".equals(String.valueOf(result.get("mode")))) {
                    Object answer = result.get("answer");
                    if (answer != null && StringUtils.hasText(String.valueOf(answer))) {
                        return String.valueOf(answer);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Pipeline AgentConfig LLM failed: {}", e.getMessage());
        }
        try {
            AiClientService.AiResponse resp = aiClientService.chat(
                    systemPrompt + "\n\n" + userPrompt,
                    "ai-page-pipeline-" + UUID.randomUUID(),
                    List.of());
            if (resp != null && StringUtils.hasText(resp.getAnswer())
                    && !"TRANSFER_HUMAN_DETECTED".equals(resp.getRawContent())) {
                return resp.getAnswer();
            }
        } catch (Exception e) {
            log.warn("Pipeline AiClient LLM failed: {}", e.getMessage());
        }
        return null;
    }

    private static Stage stage(String key, String title, String status, String note) {
        Stage s = new Stage();
        s.setKey(key);
        s.setTitle(title);
        s.setStatus(status);
        s.setNote(note);
        return s;
    }

    @SuppressWarnings("unchecked")
    private static String pageNameOf(Map<String, Object> design, String prompt) {
        Object page = design.get("page");
        if (page instanceof Map<?, ?> map) {
            Object name = map.get("name");
            if (name != null && StringUtils.hasText(String.valueOf(name))) {
                return String.valueOf(name).trim();
            }
        }
        if (StringUtils.hasText(prompt)) {
            return prompt.substring(0, Math.min(18, prompt.length()));
        }
        return "AI 设计页";
    }
}
