package com.miniprogram.service;

import com.miniprogram.dto.paidqa.PaidQaPublicVO;
import com.miniprogram.entity.PaidQaQuestion;

public interface PaidQaService {
    PaidQaQuestion createQuestion(Long userId, PaidQaQuestion draft);

    void attachOrder(Long questionId, Long orderId);

    void onOrderPaid(com.miniprogram.entity.Order order);

    void joinSpectator(Long userId, Long questionId, Long orderId, java.math.BigDecimal price);

    java.util.List<PaidQaPublicVO> listPublic(int limit);

    PaidQaQuestion getDetail(Long questionId, Long viewerUserId);

    void answerQuestion(Long operatorUserId, Long questionId, String answerBody);

    void processTimeouts();
}
