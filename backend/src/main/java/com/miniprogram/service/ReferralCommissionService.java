package com.miniprogram.service;

import com.miniprogram.entity.Order;

public interface ReferralCommissionService {
    void onOrderPaid(Order order);

    void onOrderRefunded(Long orderId);

    java.util.List<com.miniprogram.entity.ReferralCommission> listForPromoter(Long userId, String status);
}
