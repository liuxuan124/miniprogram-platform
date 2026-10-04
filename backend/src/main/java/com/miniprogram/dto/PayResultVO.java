package com.miniprogram.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 支付结果三态判定 VO。
 *
 * state 取值：
 * - success：支付成功且权益已开通
 * - unpaid：未支付（引导重新支付或查单）
 * - paid_no_grant：已扣款但权益未开通（系统自动补开通中，请稍候）
 * - paid_already：重复支付/已开通（已支付过，引导查看订单或退款进度）
 */
@Data
@Schema(description = "支付结果三态判定")
public class PayResultVO {

    @Schema(description = "判定状态: success / unpaid / paid_no_grant / paid_already")
    private String state;

    @Schema(description = "给用户看的提示文案")
    private String hint;

    @Schema(description = "是否可重新支付（unpaid 为 true，其余为 false）")
    private Boolean retryable;

    @Schema(description = "已开通的商品名列表（paid_already / success 时可能有值）")
    private List<String> alreadyGrantedItems = new ArrayList<>();

    @Schema(description = "订单当前状态")
    private String orderStatus;

    @Schema(description = "支付记录当前状态")
    private String paymentStatus;
}
