package com.miniprogram.dto.miniapp;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@Schema(description = "整包发布前检查")
public class PublishPreflightVO {

    @Schema(description = "是否可以发布")
    private boolean canPublish;
    private List<String> blocking = new ArrayList<>();
    private List<String> warnings = new ArrayList<>();
    private List<Item> pages = new ArrayList<>();
    private String latestSemver;

    @Data
    public static class Item {
        private Long id;
        private String name;
        private String path;
        private Integer status;
        /** publish / already_live / empty / builtin */
        private String action;
    }
}
