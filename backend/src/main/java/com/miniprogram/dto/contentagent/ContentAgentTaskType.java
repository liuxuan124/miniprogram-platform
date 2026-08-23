package com.miniprogram.dto.contentagent;

import lombok.Getter;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 内容 Agent 任务类型
 */
@Getter
public enum ContentAgentTaskType {

    IMPORT_QC("import_qc", "导入质检", "A1", false),
    LAYOUT_NORMALIZE("layout_normalize", "排版规范化", "A2", false),
    COMPLIANCE_CHECK("compliance_check", "合规预检", "A3", false),
    AUTO_CATEGORY("auto_category", "自动分类", "B1", true),
    AUTO_TAGS("auto_tags", "自动打标签", "B2", true),
    SUMMARY_SEO("summary_seo", "摘要与SEO", "B3", true),
    COVER_SUGGEST("cover_suggest", "封面建议", "B4", true),
    MULTI_FORMAT("multi_format", "一稿多态", "C1", true),
    TOPIC_DRAFT("topic_draft", "选题与初稿", "C2", true),
    CONTENT_REFRESH("content_refresh", "旧文焕新", "C3", true),
    PRODUCT_MOUNT("product_mount", "商品挂载建议", "D1", true),
    ANALYTICS_REVIEW("analytics_review", "内容效果复盘", "D2", false),
    SCHEDULE_SUGGEST("schedule_suggest", "发布排期建议", "D3", false),
    FREEFORM("freeform", "自由指令", "—", true);

    private final String code;
    private final String label;
    private final String group;
    private final boolean needsLlm;

    ContentAgentTaskType(String code, String label, String group, boolean needsLlm) {
        this.code = code;
        this.label = label;
        this.group = group;
        this.needsLlm = needsLlm;
    }

    public static ContentAgentTaskType fromCode(String code) {
        if (code == null) {
            return null;
        }
        return Arrays.stream(values())
                .filter(t -> t.code.equals(code))
                .findFirst()
                .orElse(null);
    }

    public static List<Map<String, Object>> toOptionList() {
        return Arrays.stream(values())
                .map(t -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("code", t.code);
                    m.put("label", t.label);
                    m.put("group", t.group);
                    m.put("needsLlm", t.needsLlm);
                    return m;
                })
                .collect(Collectors.toList());
    }
}
