package com.miniprogram.dto.mine;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "当前登录用户的「我的」页聚合数据，仅服务端按身份返回")
public class MineOverviewVO {

    private Long userId;
    private String nickname;
    private String avatarUrl;
    private String levelName;
    private Integer points;
    private Integer continuousSignDays;
    private Integer joinDays;
    private String memberExpireAt;
    private Boolean memberActive;
    private Integer favoriteCount;
    private Integer noteCount;
    private Integer followCount;
    private Integer unusedCouponCount;
    private Integer questionCount;
    private Integer inviteCount;
    private Integer pendingOrderCount;
    private LearnItem learn;
    private PlanetItem planet;

    @Data
    public static class LearnItem {
        private Long productId;
        private String title;
        private String cover;
    }

    @Data
    public static class PlanetItem {
        private String title;
        private Boolean active;
        private Integer remainDays;
    }
}
