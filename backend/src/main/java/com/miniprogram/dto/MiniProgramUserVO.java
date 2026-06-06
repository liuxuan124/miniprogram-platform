package com.miniprogram.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

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

    @Schema(description = "来源渠道")
    private String sourceChannel;

    @Schema(description = "最近访问时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime lastVisitAt;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;
}
