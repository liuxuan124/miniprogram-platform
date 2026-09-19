package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.miniprogram.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_wx_push_target")
@Schema(description = "微信体验版推送目标")
public class WxPushTarget extends BaseEntity {

    @Schema(description = "显示名")
    private String name;

    @Schema(description = "微信小程序 AppID")
    @TableField("app_id")
    private String appId;

    @Schema(description = "上传密钥 PEM（写入用；列表不回传明文）")
    @TableField("upload_key")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String uploadKey;

    @Schema(description = "服务器私钥文件路径")
    @TableField("upload_key_path")
    private String uploadKeyPath;

    @Schema(description = "是否默认目标")
    @TableField("is_default")
    private Integer isDefault;

    @Schema(description = "1=启用 0=停用")
    private Integer status;

    @Schema(description = "备注")
    private String remark;

    @Schema(description = "是否已配置密钥（库内或文件路径）")
    @TableField(exist = false)
    private Boolean hasUploadKey;
}
