package com.miniprogram.service.pageai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AiPagePipelineMatcherTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void dummyPromptKeepsUnconstrainedGapsOutOfDraft() {
        AiPagePipelineMatcher matcher = new AiPagePipelineMatcher(
                staticIndex("/api/v1/mp/products", "/api/v1/mp/contents", "/api/v1/mp/activities"),
                mapper);
        Map<String, Object> design = AiPagePipelineMatcher.fallbackDesign("茶饮首页，要3D试衣镜和商品货架");
        List<AiPagePipelineMatcher.BlockMatch> matches = matcher.match(design);

        assertTrue(matches.stream().anyMatch(m -> m.inDraft() && m.def() != null && "product_list".equals(m.def().type())));
        assertTrue(matches.stream().anyMatch(m -> "missing".equals(m.componentStatus()) && !m.inDraft()));
        assertTrue(matches.stream().anyMatch(m -> {
            String title = String.valueOf(m.block().get("title"));
            return title.contains("试衣") && "missing".equals(m.componentStatus());
        }));
        long drafted = matches.stream().filter(AiPagePipelineMatcher.BlockMatch::inDraft).count();
        assertTrue(drafted >= 3 && drafted < matches.size());
    }

    @Test
    void missingProductApiBlocksDraft() {
        AiPagePipelineMatcher matcher = new AiPagePipelineMatcher(staticIndex(), mapper);
        Map<String, Object> block = new LinkedHashMap<>();
        block.put("id", "p1");
        block.put("intent", "product_shelf");
        block.put("title", "货架");
        block.put("suggested_component", "product_list");
        Map<String, Object> design = Map.of("page", Map.of("name", "t"), "blocks", List.of(block));
        AiPagePipelineMatcher.BlockMatch match = matcher.match(design).get(0);
        assertEquals("pass", match.componentStatus());
        assertEquals("missing", match.apiStatus());
        assertFalse(match.inDraft());
    }

    @Test
    void incompleteKeepsReducedComponent() {
        AiPagePipelineMatcher matcher = new AiPagePipelineMatcher(staticIndex(), mapper);
        Map<String, Object> block = new LinkedHashMap<>();
        block.put("id", "h1");
        block.put("intent", "banner");
        block.put("title", "主视觉");
        block.put("suggested_component", "banner");
        block.put("visual", Map.of("interaction", "视差 parallax"));
        Map<String, Object> design = Map.of("page", Map.of("name", "t"), "blocks", List.of(block));
        AiPagePipelineMatcher.BlockMatch match = matcher.match(design).get(0);
        assertEquals("incomplete", match.componentStatus());
        assertTrue(match.inDraft());
        assertTrue(match.reason().contains("不支持"));
    }

    @Test
    void unknownBlockStaysMissing() {
        AiPagePipelineMatcher matcher = new AiPagePipelineMatcher(staticIndex(), mapper);
        Map<String, Object> block = new LinkedHashMap<>();
        block.put("id", "x1");
        block.put("intent", "ar_tryon");
        block.put("title", "AR 试穿");
        block.put("visual", Map.of("interaction", "webgl"));
        AiPagePipelineMatcher.BlockMatch match = matcher.match(Map.of("blocks", List.of(block))).get(0);
        assertEquals("missing", match.componentStatus());
        assertFalse(match.inDraft());
        assertNull(match.def());
    }

    @Test
    void dslOnlyContainsDraftedTypes() {
        AiPagePipelineMatcher matcher = new AiPagePipelineMatcher(
                staticIndex("/api/v1/mp/products"), mapper);
        Map<String, Object> design = AiPagePipelineMatcher.fallbackDesign("只要商品货架和3D试衣");
        List<AiPagePipelineMatcher.BlockMatch> matches = matcher.match(design);
        Map<String, Object> dsl = matcher.buildDsl(design, matches, "9", "测试页", "/pages/custom/ai-x");
        assertEquals("1.0", dsl.get("schema_version"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> comps = (List<Map<String, Object>>) dsl.get("components");
        assertNotNull(comps);
        assertFalse(comps.isEmpty());
        assertTrue(comps.stream().noneMatch(c -> "ar_tryon".equals(String.valueOf(c.get("type")))));
        assertTrue(comps.stream().anyMatch(c -> "product_list".equals(c.get("type"))));
    }

    private static MpEndpointIndex staticIndex(String... paths) {
        Set<String> set = Set.of(paths);
        return new MpEndpointIndex() {
            @Override
            public Set<String> allPaths() {
                return set;
            }

            @Override
            public boolean hasPath(String requiredPath) {
                return MpEndpointPaths.matches(requiredPath, set);
            }
        };
    }
}
