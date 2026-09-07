package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("mp_user_address")
@Schema(description = "用户收货地址")
public class UserAddress implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private Long userId;
    private String name;
    private String phone;
    private String province;
    private String city;
    private String district;
    private String detail;
    /** 1=默认 0=否 */
    private Integer isDefault;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
}
