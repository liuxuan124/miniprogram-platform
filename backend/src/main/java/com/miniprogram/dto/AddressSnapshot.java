package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 收货地址快照
 */
@Data
@Schema(description = "收货地址快照")
public class AddressSnapshot {

    @NotBlank(message = "收货人不能为空")
    @Schema(description = "收货人")
    private String name;

    @NotBlank(message = "手机号不能为空")
    @Schema(description = "手机号")
    private String phone;

    @NotBlank(message = "省份不能为空")
    @Schema(description = "省份")
    private String province;

    @NotBlank(message = "城市不能为空")
    @Schema(description = "城市")
    private String city;

    @Schema(description = "区县")
    private String district;

    @NotBlank(message = "详细地址不能为空")
    @Schema(description = "详细地址")
    private String address;

    @Schema(description = "邮编")
    private String postalCode;
}
