package com.miniprogram.dto.mini;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Schema(description = "更新站点草稿（写入 site_builder_draft，不直接改 live）")
public class MiniSiteUpdateDTO {

    @Schema(description = "站点名称")
    private String name;

    @Schema(description = "口号/副标题")
    private String slogan;

    @Schema(description = "主题配置")
    private Object theme;

    @Schema(description = "底部导航 items")
    private List<Map<String, Object>> tabBar;

    @Schema(description = "首页绑定 pageId")
    private Long homePageId;

    @Schema(description = "我的页绑定 pageId")
    private Long minePageId;

    @Schema(description = "导航模板 key")
    private String templateKey;

    @Schema(description = "我的页配置")
    private Object minePageConfig;

    @Schema(description = "分享标题")
    private String shareTitle;

    @Schema(description = "分享图")
    private String shareImage;

    @Schema(description = "完整品牌配置（可选，覆盖 name/slogan 写入）")
    private Map<String, Object> brandConfig;
}
