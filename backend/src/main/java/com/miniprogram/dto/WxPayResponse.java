package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 微信支付下单响应 VO
 */
@Data
@Schema(description = "微信支付下单响应")
public class WxPayResponse {

    @Schema(description = "订单号")
    private String orderNo;

    @Schema(description = "微信预支付ID")
    private String prepayId;

    @Schema(description = "签名类型")
    private String signType;

    @Schema(description = "支付签名")
    private String paySign;

    @Schema(description = "随机字符串")
    private String nonceStr;

    @Schema(description = "时间戳")
    private String timeStamp;

    @Schema(description = "小程序appid")
    private String appId;
}
