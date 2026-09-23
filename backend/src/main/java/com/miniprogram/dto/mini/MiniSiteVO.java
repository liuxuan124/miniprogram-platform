package com.miniprogram.dto.mini;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Data
@Schema(description = "站点聚合（管理端编辑/预览）")
public class MiniSiteVO {

    @Schema(description = "站点名称")
    private String name;

    @Schema(description = "口号/副标题")
    private String slogan;

    @Schema(description = "当前整店模板 ID（is_current=1）；空=未使用整店模板")
    private Long templateId;

    @Schema(description = "整店模板名；空时前端显示「自定义（未使用整店模板）」")
    private String templateName;

    @Schema(description = "主题配置对象")
    private Object theme;

    @Schema(description = "底部导航（编辑态默认合并 draft）")
    private List<Map<String, Object>> tabBar = new ArrayList<>();

    @Schema(description = "内容发布序号（第 N 次）")
    private Integer liveReleaseNo;

    @Schema(description = "最近一次内容发布时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime liveReleaseAt;

    @Schema(description = "最近一次内容发布操作人")
    private String livePublisherName;

    @Schema(description = "小程序首页页面 ID（配置项 miniappHomePageId）")
    private Long miniappHomePageId;

    @Schema(description = "微信代码包版本（最近推送）")
    private String wechatCodeVersion;

    @Schema(description = "待发布改动条数（站点草稿计 1 + 脏页数）")
    private Integer pendingCount;
}
