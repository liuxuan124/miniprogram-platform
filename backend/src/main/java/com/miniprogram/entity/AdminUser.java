package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.miniprogram.common.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 后台管理员实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_admin_user")
@Schema(description = "后台管理员")
public class AdminUser extends BaseEntity {

    @Schema(description = "登录账号")
    private String username;

    @Schema(description = "密码哈希")
    private String passwordHash;

    @Schema(description = "真实姓名")
    private String realName;

    @Schema(description = "手机号")
    private String phone;

    @Schema(description = "头像地址")
    private String avatarUrl;

    @Schema(description = "关联角色ID")
    private Long roleId;

    @Schema(description = "状态 1=启用 0=禁用")
    private Integer status;

    @Schema(description = "最后登录时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime lastLoginAt;
}
