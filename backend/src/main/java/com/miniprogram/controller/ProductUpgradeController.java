package com.miniprogram.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.R;
import com.miniprogram.dto.AgentConfigVO;
import com.miniprogram.entity.ContentProduct;
import com.miniprogram.entity.Product;
import com.miniprogram.mapper.ContentProductMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.service.AgentConfigService;
import com.miniprogram.service.AiClientService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Tag(name = "内容挂商品 / AI 搭页 MVP")
@RestController
@RequiredArgsConstructor
public class ProductUpgradeController {

    private final ContentProductMapper contentProductMapper;
    private final ProductMapper productMapper;
    private final AgentConfigService agentConfigService;
    private final AiClientService aiClientService;
    private final ObjectMapper objectMapper;

    @Operation(summary = "内容关联商品列表")
    @GetMapping("/api/v1/mp/contents/{id}/products")
    public R<List<Product>> listContentProducts(@PathVariable Long id) {
        List<ContentProduct> links = contentProductMapper.selectList(new LambdaQueryWrapper<ContentProduct>()
                .eq(ContentProduct::getContentId, id)
                .orderByAsc(ContentProduct::getSortOrder));
        List<Product> products = new ArrayList<>();
        for (ContentProduct link : links) {
            Product p = productMapper.selectById(link.getProductId());
            if (p != null && "on_sale".equals(p.getStatus())) {
                products.add(p);
            }
        }
        return R.ok(products);
    }

    @Operation(summary = "绑定内容商品（后台）")
    @PutMapping("/api/v1/admin/contents/{id}/products")
    @PreAuthorize("hasAuthority('content:update')")
    public R<Void> bindContentProducts(@PathVariable Long id, @RequestBody BindBody body) {
        contentProductMapper.delete(new LambdaQueryWrapper<ContentProduct>().eq(ContentProduct::getContentId, id));
        if (body != null && body.getProductIds() != null) {
            int i = 0;
            for (Long pid : body.getProductIds()) {
                ContentProduct row = new ContentProduct();
                row.setContentId(id);
                row.setProductId(pid);
                row.setSortOrder(i++);
                row.setCreateTime(LocalDateTime.now());
                contentProductMapper.insert(row);
            }
        }
        return R.ok();
    }

    @Operation(summary = "AI 生成页面 DSL 初稿")
    @PostMapping("/api/v1/admin/pages/ai-draft")
    @PreAuthorize("hasAuthority('page:create')")
    public R<Map<String, Object>> aiDraft(@RequestBody AiDraftBody body) {
        String prompt = body == null ? "" : String.valueOf(body.getPrompt() == null ? "" : body.getPrompt());
        String industry = body == null ? "general" : String.valueOf(body.getIndustry() == null ? "general" : body.getIndustry());

        String system = """
                你是小程序页面搭建助手。只返回合法 JSON（不要 markdown、不要解释），schema 如下：
                {"schema_version":"1.0","page":{"name":"字符串","type":"custom","background_color":"#f6f8fb"},"components":[{"id":"comp_xxx","type":"组件类型","props":{},"style":{}}],"global_config":{"pull_refresh":true,"reach_bottom_load":false}}
                可用 type：brand_header,banner,nav,product_list,article_feed,feature_cards,rich_text,notice_bar,search。
                components 至少 3 个；每个必须有唯一 id、type、props、style。
                """;
        String user = "行业=" + industry + "；需求=" + (prompt.isBlank() ? "通用品牌首页" : prompt);

        Map<String, Object> llmDsl = tryParseJsonObject(callLlm(system, user));
        Map<String, Object> dsl;
        String message;
        if (llmDsl != null && llmDsl.get("components") instanceof List<?> comps && !comps.isEmpty()) {
            dsl = llmDsl;
            dsl.putIfAbsent("schema_version", "1.0");
            dsl.putIfAbsent("global_config", Map.of("pull_refresh", true, "reach_bottom_load", false));
            message = "已由大模型生成页面初稿，可在装修器继续调整。";
        } else {
            dsl = buildRuleDraft(prompt, industry);
            message = "已生成规则模板初稿（大模型不可用或 JSON 解析失败）。";
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("dsl", dsl);
        resp.put("message", message);
        return R.ok(resp);
    }

    @Operation(summary = "AI 文案助手")
    @PostMapping("/api/v1/admin/ai/copy")
    @PreAuthorize("hasAuthority('content:update')")
    public R<Map<String, Object>> aiCopy(@RequestBody AiCopyBody body) {
        String kind = body == null || body.getKind() == null ? "product" : body.getKind();
        String seed = body == null || body.getSeed() == null ? "" : body.getSeed().trim();

        String system = """
                你是电商文案助手。只返回合法 JSON（不要 markdown、不要解释）。
                kind=product 时返回：{"title":"","sellingPoints":["","",""],"detailHtml":"<p></p>","shareText":""}
                kind=content 时返回：{"title":"","summary":"","tags":["",""],"shareText":""}
                其它 kind 返回：{"title":"","copy":"","shareText":""}
                """;
        String user = "kind=" + kind + "；seed=" + (seed.isBlank() ? "（空）" : seed);

        Map<String, Object> llm = tryParseJsonObject(callLlm(system, user));
        if (llm != null && llm.containsKey("title")) {
            llm.put("note", "由大模型生成");
            return R.ok(llm);
        }
        Map<String, Object> data = buildRuleCopy(kind, seed);
        data.put("note", "当前为规则模板文案（大模型不可用或 JSON 解析失败）。");
        return R.ok(data);
    }

    /** Prefer AgentConfig → AiClientService → null */
    private String callLlm(String systemPrompt, String userPrompt) {
        try {
            AgentConfigVO active = agentConfigService.getActiveConfig();
            if (active != null && StringUtils.hasText(active.getApiKey())
                    && StringUtils.hasText(active.getApiBaseUrl())) {
                Map<String, Object> body = new HashMap<>();
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
            log.warn("AgentConfig LLM call failed: {}", e.getMessage());
        }

        try {
            String q = systemPrompt + "\n\n" + userPrompt;
            AiClientService.AiResponse resp = aiClientService.chat(q, "ai-upgrade-" + UUID.randomUUID(), List.of());
            if (resp != null && StringUtils.hasText(resp.getAnswer())
                    && !"TRANSFER_HUMAN_DETECTED".equals(resp.getRawContent())) {
                // AiClient fallback often returns canned text when unconfigured — reject non-JSON-looking answers later
                return resp.getAnswer();
            }
        } catch (Exception e) {
            log.warn("AiClientService LLM call failed: {}", e.getMessage());
        }
        return null;
    }

    private Map<String, Object> tryParseJsonObject(String raw) {
        if (!StringUtils.hasText(raw)) return null;
        String text = raw.trim();
        // strip markdown fence
        if (text.contains("```")) {
            int start = text.indexOf('{');
            int end = text.lastIndexOf('}');
            if (start >= 0 && end > start) {
                text = text.substring(start, end + 1);
            }
        } else {
            int start = text.indexOf('{');
            int end = text.lastIndexOf('}');
            if (start >= 0 && end > start) {
                text = text.substring(start, end + 1);
            }
        }
        try {
            JsonNode node = objectMapper.readTree(text);
            if (node == null || !node.isObject()) return null;
            return objectMapper.convertValue(node, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.debug("JSON parse failed: {}", e.getMessage());
            return null;
        }
    }

    private Map<String, Object> buildRuleDraft(String prompt, String industry) {
        List<Map<String, Object>> components = new ArrayList<>();
        components.add(comp("brand_header", Map.of("title", "品牌名", "subtitle", prompt.isBlank() ? "一句话介绍" : prompt)));
        components.add(comp("banner", Map.of("items", List.of(Map.of("image", "", "link_url", "")))));
        components.add(comp("nav", Map.of("items", List.of(
                Map.of("title", "全部", "icon", ""),
                Map.of("title", "热门", "icon", ""),
                Map.of("title", "新品", "icon", ""),
                Map.of("title", "活动", "icon", "")
        ))));
        if (prompt.contains("商品") || "ecommerce".equals(industry)) {
            components.add(comp("product_list", Map.of("title", "精选商品", "limit", 6)));
        }
        if (prompt.contains("文章") || prompt.contains("内容") || "content".equals(industry)) {
            components.add(comp("article_feed", Map.of("title", "最新内容", "limit", 5)));
        }
        components.add(comp("feature_cards", Map.of(
                "columns", 3,
                "items", List.of(
                        Map.of("icon", "✨", "title", "卖点一", "desc", "一句话"),
                        Map.of("icon", "🚀", "title", "卖点二", "desc", "一句话"),
                        Map.of("icon", "🛡️", "title", "卖点三", "desc", "一句话")
                )
        )));
        components.add(comp("rich_text", Map.of("content", "<p>" + (prompt.isBlank() ? "在此补充品牌故事与服务说明。" : prompt) + "</p>")));
        Map<String, Object> dsl = new LinkedHashMap<>();
        dsl.put("schema_version", "1.0");
        dsl.put("page", Map.of(
                "name", prompt.isBlank() ? "AI 生成页面" : prompt.substring(0, Math.min(20, prompt.length())),
                "type", "custom",
                "background_color", "#f6f8fb"
        ));
        dsl.put("components", components);
        dsl.put("global_config", Map.of("pull_refresh", true, "reach_bottom_load", false));
        return dsl;
    }

    private Map<String, Object> buildRuleCopy(String kind, String seed) {
        Map<String, Object> data = new LinkedHashMap<>();
        if ("product".equals(kind)) {
            data.put("title", seed.isBlank() ? "精选好物 · 限时优选" : seed + " · 限时优选");
            data.put("sellingPoints", List.of(
                    "核心卖点一：解决用户痛点",
                    "核心卖点二：品质与服务保障",
                    "核心卖点三：限时优惠，立即下单"
            ));
            data.put("detailHtml", "<p>" + (seed.isBlank() ? "这里是商品详情，补充规格、适用场景与售后政策。" : seed) + "</p>");
            data.put("shareText", "我发现一个不错的" + (seed.isBlank() ? "商品" : seed) + "，推荐给你看看～");
        } else if ("content".equals(kind)) {
            data.put("title", seed.isBlank() ? "一篇值得收藏的干货" : seed);
            data.put("summary", "3 分钟读完，帮你抓住重点。");
            data.put("tags", List.of("干货", "推荐", "运营"));
            data.put("shareText", "这篇内容写得很实用，分享给你。");
        } else {
            data.put("title", seed.isBlank() ? "活动来了" : seed);
            data.put("copy", "限时福利进行中，戳进来看看有没有你需要的。");
            data.put("shareText", "一起参加活动吧！");
        }
        return data;
    }

    private Map<String, Object> comp(String type, Map<String, Object> props) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("id", "comp_" + type + "_" + UUID.randomUUID().toString().substring(0, 6));
        c.put("type", type);
        c.put("props", props);
        c.put("style", Map.of());
        return c;
    }

    @Data
    public static class BindBody {
        private List<Long> productIds;
    }

    @Data
    public static class AiDraftBody {
        private String prompt;
        private String industry;
    }

    @Data
    public static class AiCopyBody {
        private String kind;
        private String seed;
    }
}
