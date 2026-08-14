package com.miniprogram.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 小程序用户 VO
 */
@Data
@Schema(description = "小程序用户信息")
public class MiniProgramUserVO {

    @Schema(description = "主键ID")
    private Long id;

    @Schema(description = "微信openid")
    private String openid;

    @Schema(description = "用户昵称")
    private String nickname;

    @Schema(description = "手机号")
    private String phone;

    @Schema(description = "头像URL")
    private String avatar;

    @Schema(description = "积分")
    private Integer points;

    @Schema(description = "等级ID")
    private Long levelId;

    @Schema(description = "等级名称")
    private String levelName;

    @Schema(description = "来源渠道编码：share/scan/search/ad/other")
    private String sourceChannel;

    @Schema(description = "来源渠道展示名")
    private String sourceChannelLabel;

    @Schema(description = "最近访问时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime lastVisitAt;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;

    @Schema(description = "订单数（有效订单）")
    private Integer orderCount;

    @Schema(description = "表单提交数")
    private Integer formCount;

    @Schema(description = "活动报名数")
    private Integer actCount;

    @Schema(description = "累计实付消费")
    private BigDecimal totalSpent;

    @Schema(description = "行为标签")
    private List<String> tags = new ArrayList<>();

    @Schema(description = "近期活跃")
    private List<ActivityItem> activities = new ArrayList<>();

    @Data
    @Schema(description = "用户活跃记录")
    public static class ActivityItem {
        private String content;
        @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
        private LocalDateTime time;
    }
}
