package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.RefundVO;
import com.miniprogram.entity.Refund;
import com.baomidou.mybatisplus.extension.service.IService;

/**
 * 退款 Service
 */
public interface RefundService extends IService<Refund> {

    /**
     * 退款列表
     */
    PageResult<RefundVO> listRefunds(Integer current, Integer size, String status);

    /**
     * 执行退款（调用微信退款API）
     */
    void executeRefund(Long refundId);
}
