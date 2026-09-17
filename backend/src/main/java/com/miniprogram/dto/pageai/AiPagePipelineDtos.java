package com.miniprogram.dto.pageai;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class AiPagePipelineDtos {

    private AiPagePipelineDtos() {
    }

    @Data
    @Schema(description = "AI 搭页流水线入参")
    public static class Request {
        @Schema(description = "运营描述")
        private String prompt;
    }

    @Data
    public static class Stage {
        private String key;
        private String title;
        private String status;
        private String note;
    }

    @Data
    public static class ReportRow {
        private String blockId;
        private String title;
        private String intent;
        private String componentStatus;
        private String matchedType;
        private String matchedLabel;
        private String apiStatus;
        private String apiPath;
        private boolean inDraft;
        private String reason;
    }

    @Data
    public static class DraftRef {
        @JsonSerialize(using = ToStringSerializer.class)
        private Long pageId;
        private String name;
        private String path;
        private int componentCount;
    }

    @Data
    @Schema(description = "AI 搭页流水线结果")
    public static class Result {
        private boolean llmUsed;
        private String pageName;
        private List<Stage> stages = new ArrayList<>();
        private Map<String, Object> design = new LinkedHashMap<>();
        private List<ReportRow> report = new ArrayList<>();
        private DraftRef draft;
    }
}
