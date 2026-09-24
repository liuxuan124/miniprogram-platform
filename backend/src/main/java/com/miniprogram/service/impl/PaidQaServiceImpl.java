package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.dto.paidqa.PaidQaPublicVO;
import com.miniprogram.entity.PaidQaQuestion;
import com.miniprogram.entity.Order;
import com.miniprogram.entity.PaidQaSpectator;
import com.miniprogram.mapper.PaidQaQuestionMapper;
import com.miniprogram.mapper.PaidQaSpectatorMapper;
import com.miniprogram.service.PaidQaService;
import com.miniprogram.service.RefundService;
import com.miniprogram.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaidQaServiceImpl implements PaidQaService {

    private final PaidQaQuestionMapper paidQaQuestionMapper;
    private final PaidQaSpectatorMapper paidQaSpectatorMapper;
    private final SystemConfigService systemConfigService;
    private final RefundService refundService;

    @Override
    public PaidQaQuestion createQuestion(Long userId, PaidQaQuestion draft) {
        PaidQaQuestion row = draft != null ? draft : new PaidQaQuestion();
        row.setUserId(userId);
        if (row.getPriceAmount() == null) {
            String def = systemConfigService.getConfigValue("paid_qa_default_price");
            row.setPriceAmount(new BigDecimal(def != null && !def.isBlank() ? def : "29"));
        }
        row.setStatus("pending_pay");
        row.setTimeoutAt(LocalDateTime.now().plusHours(48));
        row.setCreatedAt(LocalDateTime.now());
        row.setUpdatedAt(LocalDateTime.now());
        paidQaQuestionMapper.insert(row);
        return row;
    }

    @Override
    public void answerQuestion(Long operatorUserId, Long questionId, String answerBody) {
        PaidQaQuestion q = paidQaQuestionMapper.selectById(questionId);
        if (q == null) throw new BusinessException(404001, "问题不存在");
        q.setAnswerBody(answerBody);
        q.setAnswerAt(LocalDateTime.now());
        q.setStatus("answered");
        q.setUpdatedAt(LocalDateTime.now());
        paidQaQuestionMapper.updateById(q);
    }

    @Override
    public void attachOrder(Long questionId, Long orderId) {
        PaidQaQuestion q = paidQaQuestionMapper.selectById(questionId);
        if (q == null) throw new BusinessException(404001, "问题不存在");
        q.setOrderId(orderId);
        q.setUpdatedAt(LocalDateTime.now());
        paidQaQuestionMapper.updateById(q);
    }

    @Override
    public void onOrderPaid(Order order) {
        if (order == null || order.getId() == null) return;
        PaidQaQuestion q = paidQaQuestionMapper.selectOne(new LambdaQueryWrapper<PaidQaQuestion>()
                .eq(PaidQaQuestion::getOrderId, order.getId()).last("LIMIT 1"));
        if (q != null && "pending_pay".equals(q.getStatus())) {
            q.setStatus("pending_answer");
            q.setTimeoutAt(LocalDateTime.now().plusHours(48));
            q.setUpdatedAt(LocalDateTime.now());
            paidQaQuestionMapper.updateById(q);
            return;
        }
        PaidQaSpectator sp = paidQaSpectatorMapper.selectOne(new LambdaQueryWrapper<PaidQaSpectator>()
                .eq(PaidQaSpectator::getOrderId, order.getId()).last("LIMIT 1"));
        if (sp != null && sp.getQuestionId() != null) {
            // 已支付围观，无需改问题状态
        }
    }

    @Override
    public void joinSpectator(Long userId, Long questionId, Long orderId, BigDecimal price) {
        PaidQaSpectator row = new PaidQaSpectator();
        row.setQuestionId(questionId);
        row.setUserId(userId);
        row.setOrderId(orderId);
        row.setPriceAmount(price);
        row.setCreatedAt(LocalDateTime.now());
        paidQaSpectatorMapper.insert(row);
    }

    @Override
    public List<PaidQaPublicVO> listPublic(int limit) {
        int lim = Math.max(1, Math.min(limit, 50));
        List<PaidQaQuestion> rows = paidQaQuestionMapper.selectList(new LambdaQueryWrapper<PaidQaQuestion>()
                .eq(PaidQaQuestion::getVisibility, "public")
                .in(PaidQaQuestion::getStatus, List.of("pending_answer", "answered"))
                .orderByDesc(PaidQaQuestion::getCreatedAt)
                .last("LIMIT " + lim));
        return rows.stream().map(this::toPublicVO).toList();
    }

    private PaidQaPublicVO toPublicVO(PaidQaQuestion q) {
        PaidQaPublicVO vo = new PaidQaPublicVO();
        vo.setId(q.getId());
        vo.setTitle(q.getTitle());
        vo.setBody(q.getBody());
        vo.setVisibility(q.getVisibility());
        vo.setStatus(q.getStatus());
        vo.setAnswerBody(q.getAnswerBody());
        vo.setAnswerAt(q.getAnswerAt());
        vo.setPriceAmount(q.getPriceAmount());
        long spectators = paidQaSpectatorMapper.selectCount(new LambdaQueryWrapper<PaidQaSpectator>()
                .eq(PaidQaSpectator::getQuestionId, q.getId()));
        vo.setSpectatorCount((int) Math.min(spectators, Integer.MAX_VALUE));
        return vo;
    }

    @Override
    public PaidQaQuestion getDetail(Long questionId, Long viewerUserId) {
        PaidQaQuestion q = paidQaQuestionMapper.selectById(questionId);
        if (q == null) throw new BusinessException(404001, "问题不存在");
        boolean owner = viewerUserId != null && viewerUserId.equals(q.getUserId());
        boolean spectator = viewerUserId != null && paidQaSpectatorMapper.selectCount(
                new LambdaQueryWrapper<PaidQaSpectator>()
                        .eq(PaidQaSpectator::getQuestionId, questionId)
                        .eq(PaidQaSpectator::getUserId, viewerUserId)) > 0;
        if ("private".equals(q.getVisibility()) && !owner && !spectator) {
            q.setAnswerBody(null);
            q.setBody(null);
        } else if (!owner && !spectator && "answered".equals(q.getStatus()) && "public".equals(q.getVisibility())) {
            // 公开已答可看不遮
        } else if (!owner && !spectator) {
            q.setAnswerBody(null);
        }
        return q;
    }

    @Override
    public void processTimeouts() {
        paidQaQuestionMapper.selectList(new LambdaQueryWrapper<PaidQaQuestion>()
                .eq(PaidQaQuestion::getStatus, "pending_answer")
                .lt(PaidQaQuestion::getTimeoutAt, LocalDateTime.now()))
                .forEach(q -> {
                    q.setStatus("timeout_refund");
                    q.setUpdatedAt(LocalDateTime.now());
                    paidQaQuestionMapper.updateById(q);
                    if (q.getOrderId() != null) {
                        try {
                            refundService.trySystemFullRefund(q.getOrderId(), "付费问答超时未回答");
                        } catch (Exception e) {
                            // 失败时订单 needManualRefund 已由 RefundService 标记
                        }
                    }
                });
    }
}
