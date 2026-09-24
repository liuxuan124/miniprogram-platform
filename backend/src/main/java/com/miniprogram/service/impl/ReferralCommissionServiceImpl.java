package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.entity.InviteRelation;
import com.miniprogram.entity.Order;
import com.miniprogram.entity.ReferralCommission;
import com.miniprogram.mapper.InviteRelationMapper;
import com.miniprogram.mapper.ReferralCommissionMapper;
import com.miniprogram.service.ReferralCommissionService;
import com.miniprogram.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReferralCommissionServiceImpl implements ReferralCommissionService {

    private final ReferralCommissionMapper referralCommissionMapper;
    private final InviteRelationMapper inviteRelationMapper;
    private final SystemConfigService systemConfigService;

    @Override
    public void onOrderPaid(Order order) {
        if (order == null || order.getUserId() == null || order.getPayAmount() == null) return;
        ReferralCommission exists = referralCommissionMapper.selectOne(new LambdaQueryWrapper<ReferralCommission>()
                .eq(ReferralCommission::getOrderId, order.getId()).last("LIMIT 1"));
        if (exists != null) return;

        InviteRelation rel = inviteRelationMapper.selectOne(new LambdaQueryWrapper<InviteRelation>()
                .eq(InviteRelation::getInviteeId, order.getUserId())
                .orderByAsc(InviteRelation::getCreateTime)
                .last("LIMIT 1"));
        if (rel == null || rel.getInviterId() == null) return;

        BigDecimal rate = parseRate();
        BigDecimal amount = order.getPayAmount().multiply(rate).setScale(2, RoundingMode.HALF_UP);
        if (amount.compareTo(BigDecimal.ZERO) <= 0) return;

        ReferralCommission row = new ReferralCommission();
        row.setPromoterUserId(rel.getInviterId());
        row.setBuyerUserId(order.getUserId());
        row.setOrderId(order.getId());
        row.setAmount(amount);
        row.setRate(rate);
        row.setStatus("frozen");
        row.setAvailableAt(LocalDateTime.now().plusDays(3));
        row.setCreatedAt(LocalDateTime.now());
        referralCommissionMapper.insert(row);
        log.info("referral commission frozen orderId={} promoter={} amount={}", order.getId(), rel.getInviterId(), amount);
    }

    @Override
    public void onOrderRefunded(Long orderId) {
        if (orderId == null) return;
        ReferralCommission row = referralCommissionMapper.selectOne(new LambdaQueryWrapper<ReferralCommission>()
                .eq(ReferralCommission::getOrderId, orderId).last("LIMIT 1"));
        if (row == null || "revoked".equals(row.getStatus())) return;
        row.setStatus("revoked");
        referralCommissionMapper.updateById(row);
    }

    @Override
    public List<ReferralCommission> listForPromoter(Long userId, String status) {
        LambdaQueryWrapper<ReferralCommission> qw = new LambdaQueryWrapper<ReferralCommission>()
                .eq(ReferralCommission::getPromoterUserId, userId)
                .orderByDesc(ReferralCommission::getCreatedAt);
        if (status != null && !status.isBlank()) {
            qw.eq(ReferralCommission::getStatus, status.trim());
        }
        return referralCommissionMapper.selectList(qw);
    }

    private BigDecimal parseRate() {
        String raw = systemConfigService.getConfigValue("referral_commission_rate");
        try {
            return new BigDecimal(raw != null && !raw.isBlank() ? raw.trim() : "0.1");
        } catch (Exception e) {
            return new BigDecimal("0.1");
        }
    }
}
