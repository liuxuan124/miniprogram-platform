package com.miniprogram.service;

import com.miniprogram.dto.member.SignInVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * 会员积分结果模型测试。
 */
class MemberServiceIntegrationTest {

    @Test
    @DisplayName("签到结果 - 记录获得积分、连续天数和总积分")
    void should_holdSignInResultFields() {
        SignInVO result = new SignInVO();
        result.setEarnedPoints(10);
        result.setContinuousSignDays(3);
        result.setTotalPoints(120);

        assertEquals(10, result.getEarnedPoints());
        assertEquals(3, result.getContinuousSignDays());
        assertEquals(120, result.getTotalPoints());
    }
}
