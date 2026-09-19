package com.miniprogram.dto.miniapp;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
@Schema(description = "微信推送目标保存")
public class WxPushTargetDTO {

    @NotBlank(message = "请填写名称")
    @Schema(description = "显示名")
    private String name;

    @NotBlank(message = "请填写 AppID")
    @Schema(description = "微信小程序 AppID")
    private String appId;

    @Schema(description = "上传密钥 PEM；留空表示不改")
    private String uploadKey;

    @Schema(description = "服务器私钥文件绝对路径")
    private String uploadKeyPath;

    @Schema(description = "设为默认推送目标")
    private Boolean isDefault;

    @Schema(description = "1=启用 0=停用")
    private Integer status;

    @Schema(description = "备注")
    private String remark;
}
