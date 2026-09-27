package com.miniprogram.dto.mini;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@Schema(description = "内容发布预检结果")
public class ContentPreflightVO {

    private boolean canPublish;
    private List<String> blocking = new ArrayList<>();
    private List<String> warnings = new ArrayList<>();
    private List<Item> items = new ArrayList<>();

    @Data
    public static class Item {
        private String changeId;
        /** ok | block | warn */
        private String status;
        /** site | page | manifest */
        private String category;
        private String blockerReason;
    }
}
