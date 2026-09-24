package com.miniprogram.service;

import com.miniprogram.entity.Order;

public interface FulfillmentOrchestratorService {
    /** 支付成功后执行交付（幂等，写 mp_fulfillment_log，失败重试最多 3 次） */
    void fulfillPaidOrder(Order order);
}
