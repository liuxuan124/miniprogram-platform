package com.miniprogram.service;

import com.miniprogram.dto.member.MembershipPlanDTO;
import com.miniprogram.dto.member.MembershipPlanVO;
import com.miniprogram.entity.MembershipPlan;

import java.util.List;

/**
 * 付费会员档（平台 / 星球）Service
 */
public interface MembershipPlanService extends BaseService<MembershipPlan> {

    /**
     * 按 scope / planetId 列表
     *
     * @param scope    platform | planet；空则全部
     * @param planetId scope=planet 时过滤
     */
    List<MembershipPlanVO> listPlans(String scope, String planetId);

    MembershipPlanVO createPlan(MembershipPlanDTO dto);

    MembershipPlanVO updatePlan(Long id, MembershipPlanDTO dto);

    void deletePlan(Long id);
}
