package com.miniprogram.service.pageai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.dto.pageai.AiPagePipelineDtos.ReportRow;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * 对照装修器注册表 + 真实接口做确定性匹配。LLM 只提供设计稿/提示，不作为检查结论。
 */
public final class AiPagePipelineMatcher {

    public static final String SCHEMA_VERSION = "1.0";

    public record BlockMatch(
            Map<String, Object> block,
            PageBuilderComponentCatalog.Def def,
            String componentStatus,
            String apiStatus,
            boolean inDraft,
            String reason,
            List<String> gaps
    ) {
        public ReportRow toRow() {
            ReportRow row = new ReportRow();
            row.setBlockId(str(block.get("id")));
            row.setTitle(firstNonBlank(str(block.get("title")), str(block.get("intent")), "未命名区块"));
            row.setIntent(str(block.get("intent")));
            row.setComponentStatus(componentStatus);
            if (def != null) {
                row.setMatchedType(def.type());
                row.setMatchedLabel(def.label());
                row.setApiPath(def.apiPath());
            }
            row.setApiStatus(apiStatus);
            row.setInDraft(inDraft);
            row.setReason(reason);
            return row;
        }
    }

    private final MpEndpointIndex endpointIndex;
    private final ObjectMapper objectMapper;

    public AiPagePipelineMatcher(MpEndpointIndex endpointIndex, ObjectMapper objectMapper) {
        this.endpointIndex = endpointIndex;
        this.objectMapper = objectMapper;
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> blocksOf(Map<String, Object> design) {
        Object raw = design == null ? null : design.get("blocks");
        if (!(raw instanceof List<?> list)) {
            return List.of();
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                out.add(new LinkedHashMap<>((Map<String, Object>) map));
            }
        }
        return out;
    }

    public List<BlockMatch> match(Map<String, Object> design) {
        List<BlockMatch> matches = new ArrayList<>();
        for (Map<String, Object> block : blocksOf(design)) {
            matches.add(matchBlock(block));
        }
        return matches;
    }

    public Map<String, Object> buildDsl(
            Map<String, Object> design,
            List<BlockMatch> matches,
            String pageId,
            String pageName,
            String path
    ) {
        Map<String, Object> pageMeta = asMap(design.get("page"));
        String bg = firstNonBlank(str(pageMeta.get("background_color")), "#f6f8fb");

        List<Map<String, Object>> components = new ArrayList<>();
        for (BlockMatch match : matches) {
            if (!match.inDraft || match.def == null) {
                continue;
            }
            components.add(toComponent(match));
        }

        Map<String, Object> page = new LinkedHashMap<>();
        page.put("id", pageId);
        page.put("name", pageName);
        page.put("type", "custom");
        page.put("path", path);
        page.put("background_color", bg);

        Map<String, Object> dsl = new LinkedHashMap<>();
        dsl.put("schema_version", SCHEMA_VERSION);
        dsl.put("page", page);
        dsl.put("components", components);
        dsl.put("global_config", Map.of("pull_refresh", true, "reach_bottom_load", false));
        return dsl;
    }

    public String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("序列化失败", e);
        }
    }

    BlockMatch matchBlock(Map<String, Object> block) {
        String hay = haystack(block);
        PageBuilderComponentCatalog.Def hinted = PageBuilderComponentCatalog.get(str(block.get("suggested_component")));
        PageBuilderComponentCatalog.Def scored = bestAlias(hay);
        PageBuilderComponentCatalog.Def def = hinted != null ? hinted : scored;

        if (def == null) {
            return new BlockMatch(block, null, "missing", "n/a", false,
                    "装修器没有对应组件，无法搭建", List.of("missing_component"));
        }

        List<String> gaps = completenessGaps(block, def, hay);
        boolean incomplete = !gaps.isEmpty();
        String componentStatus = incomplete ? "incomplete" : "pass";

        String apiStatus = "n/a";
        boolean apiOk = true;
        if (def.apiPath() != null && !"none".equals(def.dataNeed())) {
            apiOk = endpointIndex.hasPath(def.apiPath());
            apiStatus = apiOk ? "pass" : "missing";
        }

        boolean inDraft = apiOk;
        String reason;
        if (!apiOk) {
            reason = "组件「" + def.label() + "」需要接口 " + def.apiPath() + "，当前仓库未注册";
            inDraft = false;
        } else if (incomplete) {
            reason = "可搭「" + def.label() + "」，但缺：" + String.join("；", gaps);
        } else {
            reason = "可搭「" + def.label() + "」" + ("n/a".equals(apiStatus) ? "（静态区块）" : "，接口 " + def.apiPath());
        }
        return new BlockMatch(block, def, componentStatus, apiStatus, inDraft, reason, gaps);
    }

    static Map<String, Object> fallbackDesign(String prompt) {
        String text = prompt == null ? "" : prompt.trim();
        String name = text.isBlank() ? "AI 设计页" : text.substring(0, Math.min(18, text.length()));
        List<Map<String, Object>> blocks = new ArrayList<>();
        blocks.add(block("b1", "cinematic_hero", "沉浸首屏", text.isBlank() ? "品牌主视觉" : text,
                "满屏氛围图+视差滚动", "parallax,sticky玻璃", "static", null));
        blocks.add(block("b2", "brand_header", "品牌顶栏", name, "顶栏", "", "static", "brand_header"));
        blocks.add(block("b3", "banner", "主视觉轮播", "活动主图", "大图轮播", "swipe", "static", "banner"));
        blocks.add(block("b4", "selling_points", "服务卖点", "三张卖点卡", "卡片", "", "static", "feature_cards"));

        String lower = text.toLowerCase(Locale.ROOT);
        if (containsAny(lower, "商品", "货", "买", "商城", "sku", "product", "goods")) {
            blocks.add(block("b5", "product_shelf", "精选商品", "货架", "双列商品", "tap", "goods", "product_list"));
        }
        if (containsAny(lower, "文章", "资讯", "内容", "干货", "笔记")) {
            blocks.add(block("b6", "article_feed", "最新内容", "内容流", "信息流", "scroll", "articles", "article_feed"));
        }
        if (containsAny(lower, "活动", "报名", "场次")) {
            blocks.add(block("b7", "activity_list", "近期活动", "活动列表", "列表", "tap", "activities", "activity_list"));
        }
        if (containsAny(lower, "券", "优惠", "折扣")) {
            blocks.add(block("b8", "coupon", "领券", "优惠券", "横滑领券", "claim", "coupon", "coupon"));
        }
        if (containsAny(lower, "3d", "ar", "试衣", "试穿", "沉浸")) {
            blocks.add(block("b9", "ar_tryon", "3D 试衣镜", "实时试穿", "AR/3D", "ar,3d,webgl", "none", null));
        }
        if (containsAny(lower, "直播", "live")) {
            blocks.add(block("b10", "live_stream", "直播带货", "直播间入口", "全屏直播", "live,弹幕", "none", null));
        }
        if (containsAny(lower, "地图", "门店", "导航")) {
            blocks.add(block("b11", "store_map", "门店地图", "附近门店", "地图", "map", "none", null));
        }
        blocks.add(block("b12", "rich_text", "品牌说明", text.isBlank() ? "补充品牌故事与服务说明。" : text,
                "正文", "", "static", "rich_text"));

        Map<String, Object> page = new LinkedHashMap<>();
        page.put("name", name);
        page.put("background_color", "#f6f8fb");
        page.put("style_notes", "自由视觉稿，不限于现有组件");

        Map<String, Object> design = new LinkedHashMap<>();
        design.put("page", page);
        design.put("blocks", blocks);
        design.put("source", "rule");
        return design;
    }

    private static Map<String, Object> block(
            String id, String intent, String title, String copy,
            String layout, String interaction, String dataNeed, String suggested
    ) {
        Map<String, Object> visual = new LinkedHashMap<>();
        visual.put("layout", layout);
        visual.put("interaction", interaction);
        Map<String, Object> b = new LinkedHashMap<>();
        b.put("id", id);
        b.put("intent", intent);
        b.put("title", title);
        b.put("copy", copy);
        b.put("visual", visual);
        b.put("data_need", dataNeed);
        if (suggested != null) {
            b.put("suggested_component", suggested);
        }
        return b;
    }

    private Map<String, Object> toComponent(BlockMatch match) {
        PageBuilderComponentCatalog.Def def = match.def;
        Map<String, Object> block = match.block;
        Map<String, Object> props = defaultProps(def.type());
        String title = firstNonBlank(str(block.get("title")), def.label());
        String copy = str(block.get("copy"));
        if (props.containsKey("title")) {
            props.put("title", title);
        }
        if (props.containsKey("subtitle") && !copy.isBlank()) {
            props.put("subtitle", copy.length() > 40 ? copy.substring(0, 40) : copy);
        }
        if ("rich_text".equals(def.type()) || "brand_intro".equals(def.type()) || "image_text".equals(def.type())) {
            props.put("content", copy.isBlank() ? "<p>请补充文案</p>" : "<p>" + escape(copy) + "</p>");
        }
        if ("notice_bar".equals(def.type())) {
            props.put("text", firstNonBlank(copy, title));
        }
        if ("brand_header".equals(def.type())) {
            props.put("title", title);
            props.put("subtitle", firstNonBlank(copy, "欢迎光临"));
        }

        Map<String, Object> comp = new LinkedHashMap<>();
        String id = str(block.get("id"));
        comp.put("id", id.isBlank() ? "comp_" + UUID.randomUUID().toString().substring(0, 8) : "comp_" + id);
        comp.put("type", def.type());
        comp.put("props", props);
        comp.put("style", defaultStyle(def.type()));
        return comp;
    }

    private static Map<String, Object> defaultProps(String type) {
        Map<String, Object> p = new LinkedHashMap<>();
        switch (type) {
            case "banner" -> p.put("images", List.of(Map.of("image", "", "title", "轮播图", "link_type", "none", "link_url", "")));
            case "search" -> {
                p.put("placeholder", "搜索商品/文章/活动");
                p.put("scope", "all");
            }
            case "notice_bar" -> p.put("text", "公告");
            case "nav", "category_nav" -> p.put("items", List.of(
                    Map.of("title", "全部", "icon", ""),
                    Map.of("title", "热门", "icon", ""),
                    Map.of("title", "新品", "icon", ""),
                    Map.of("title", "活动", "icon", "")
            ));
            case "product_list" -> {
                p.put("title", "精选商品");
                p.put("layout", "grid");
                p.put("columns", 2);
                p.put("limit", 6);
                p.put("data_source", Map.of("type", "product", "params", Map.of("status", "on_sale")));
            }
            case "flash_sale" -> {
                p.put("title", "限时秒杀");
                p.put("limit", 4);
                p.put("countdown", true);
            }
            case "article_list", "article_feed", "hot_news" -> {
                p.put("title", "最新内容");
                p.put("limit", 5);
                p.put("data_source", Map.of("type", "content", "params", Map.of("status", "published")));
            }
            case "note_feed" -> p.put("data_source", Map.of("type", "content", "params", Map.of("status", "published", "contentType", "note")));
            case "moments_feed" -> p.put("data_source", Map.of("type", "content", "params", Map.of("status", "published", "contentType", "moment")));
            case "activity_list", "activity_entry" -> {
                p.put("title", "近期活动");
                p.put("data_source", Map.of("type", "activity", "params", Map.of()));
            }
            case "coupon" -> {
                p.put("title", "领券中心");
                p.put("button_text", "领取");
                p.put("data_source", Map.of("type", "coupon", "params", Map.of("status", "active")));
            }
            case "appointment_service" -> {
                p.put("title", "预约服务");
                p.put("data_source", Map.of("type", "appointment_service", "params", Map.of()));
            }
            case "feature_cards" -> {
                p.put("columns", 3);
                p.put("items", List.of(
                        Map.of("icon", "✨", "title", "卖点一", "desc", "一句话"),
                        Map.of("icon", "🚀", "title", "卖点二", "desc", "一句话"),
                        Map.of("icon", "🛡️", "title", "卖点三", "desc", "一句话")
                ));
            }
            case "rich_text" -> p.put("content", "<p></p>");
            case "brand_header" -> {
                p.put("title", "品牌名");
                p.put("subtitle", "");
            }
            case "video" -> {
                p.put("title", "视频");
                p.put("src", "");
            }
            case "form_entry" -> {
                p.put("title", "填写表单");
                p.put("button_text", "去填写");
                p.put("template_id", "");
            }
            case "member_card" -> p.put("title", "会员卡");
            case "ai_entry" -> p.put("title", "智能助手");
            case "spacer" -> p.put("height", 16);
            case "section_title" -> p.put("title", "分区标题");
            default -> p.put("title", "");
        }
        return p;
    }

    private static Map<String, Object> defaultStyle(String type) {
        if ("spacer".equals(type) || "divider".equals(type)) {
            return Map.of();
        }
        return Map.of("margin_left", 12, "margin_right", 12);
    }

    private static List<String> completenessGaps(Map<String, Object> block, PageBuilderComponentCatalog.Def def, String hay) {
        List<String> gaps = new ArrayList<>();
        for (String field : stringList(block.get("requested_fields"))) {
            if (!containsKey(def.propKeys(), field)) {
                gaps.add("缺字段 " + field);
            }
        }
        for (String interaction : stringList(block.get("requested_interactions"))) {
            if (!containsKey(def.interactions(), interaction) && !interaction.isBlank()) {
                gaps.add("缺交互 " + interaction);
            }
        }
        for (String style : stringList(block.get("requested_styles"))) {
            if (!containsKey(def.styleKeys(), style) && !style.isBlank()) {
                gaps.add("缺样式 " + style);
            }
        }
        String visual = visualText(block);
        for (String bad : def.unsupported()) {
            if (!bad.isBlank() && (hay.contains(bad) || visual.contains(bad))) {
                gaps.add("现有「" + def.label() + "」不支持 " + bad);
            }
        }
        Set<String> globalUnsupported = Set.of("3d", "ar", "webgl", "直播", "live", "视差", "parallax", "地图", "弹幕", "粒子");
        if (def.unsupported().isEmpty()) {
            for (String bad : globalUnsupported) {
                if (hay.contains(bad) || visual.contains(bad)) {
                    if (Set.of("cinematic_hero", "ar_tryon", "live_stream", "store_map").contains(str(block.get("intent")))
                            || hintedMissingCapability(str(block.get("intent")), bad)) {
                        gaps.add("现有组件不支持 " + bad);
                    }
                }
            }
        }
        return gaps;
    }

    private static boolean hintedMissingCapability(String intent, String bad) {
        String i = intent == null ? "" : intent.toLowerCase(Locale.ROOT);
        return i.contains(bad) || i.contains("hero") || i.contains("try") || i.contains("live") || i.contains("map");
    }

    private static PageBuilderComponentCatalog.Def bestAlias(String hay) {
        PageBuilderComponentCatalog.Def best = null;
        int bestScore = 0;
        for (PageBuilderComponentCatalog.Def def : PageBuilderComponentCatalog.all()) {
            int score = 0;
            for (String alias : def.aliases()) {
                if (alias.length() >= 2 && hay.contains(alias)) {
                    score += alias.length();
                }
            }
            if (score > bestScore) {
                bestScore = score;
                best = def;
            }
        }
        return bestScore >= 2 ? best : null;
    }

    private static String haystack(Map<String, Object> block) {
        StringBuilder sb = new StringBuilder();
        for (String key : List.of("intent", "title", "copy", "data_need", "suggested_component")) {
            sb.append(' ').append(str(block.get(key)));
        }
        sb.append(' ').append(visualText(block));
        return sb.toString().toLowerCase(Locale.ROOT);
    }

    private static String visualText(Map<String, Object> block) {
        Object visual = block.get("visual");
        if (visual instanceof Map<?, ?> map) {
            return (str(map.get("layout")) + " " + str(map.get("style")) + " " + str(map.get("interaction"))).toLowerCase(Locale.ROOT);
        }
        return str(visual).toLowerCase(Locale.ROOT);
    }

    @SuppressWarnings("unchecked")
    static Map<String, Object> asMap(Object raw) {
        if (raw instanceof Map<?, ?> map) {
            return new LinkedHashMap<>((Map<String, Object>) map);
        }
        return new LinkedHashMap<>();
    }

    static Map<String, Object> parseDesign(ObjectMapper mapper, String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            String text = raw.trim();
            int start = text.indexOf('{');
            int end = text.lastIndexOf('}');
            if (start >= 0 && end > start) {
                text = text.substring(start, end + 1);
            }
            JsonNode node = mapper.readTree(text);
            if (node == null || !node.isObject()) {
                return null;
            }
            Map<String, Object> design = mapper.convertValue(node, Map.class);
            Object blocks = design.get("blocks");
            if (!(blocks instanceof List<?>) || ((List<?>) blocks).isEmpty()) {
                return null;
            }
            return design;
        } catch (Exception e) {
            return null;
        }
    }

    private static List<String> stringList(Object raw) {
        if (raw instanceof List<?> list) {
            List<String> out = new ArrayList<>();
            for (Object item : list) {
                if (item != null && !String.valueOf(item).isBlank()) {
                    out.add(String.valueOf(item).trim().toLowerCase(Locale.ROOT));
                }
            }
            return out;
        }
        if (raw instanceof String s && !s.isBlank()) {
            return List.of(s.trim().toLowerCase(Locale.ROOT));
        }
        return List.of();
    }

    private static boolean containsKey(Set<String> keys, String value) {
        String v = value.toLowerCase(Locale.ROOT);
        for (String key : keys) {
            if (key.equals(v) || v.contains(key) || key.contains(v)) {
                return true;
            }
        }
        return false;
    }

    private static boolean containsAny(String hay, String... needles) {
        for (String n : needles) {
            if (hay.contains(n.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    private static String str(Object v) {
        return v == null ? "" : String.valueOf(v).trim();
    }

    private static String firstNonBlank(String... vals) {
        for (String v : vals) {
            if (v != null && !v.isBlank()) {
                return v;
            }
        }
        return "";
    }

    private static String escape(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
