package com.miniprogram.dto.miniapp;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
@Schema(description = "推送微信小程序体验版结果")
public class PushPreviewResultVO {

    @Schema(description = "版本号")
    private String version;

    @Schema(description = "上传描述")
    private String versionDesc;

    @Schema(description = "关联后台发布版本 ID")
    private Long releaseId;

    @Schema(description = "关联后台发布 semver")
    private String releaseSemver;

    @Schema(description = "上传完成时间")
    private LocalDateTime uploadedAt;

    @Schema(description = "微信公众平台管理地址")
    private String manageUrl;

    @Schema(description = "提示信息")
    private String message;
}
