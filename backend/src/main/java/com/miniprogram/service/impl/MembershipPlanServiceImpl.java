package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.dto.member.MembershipPlanDTO;
import com.miniprogram.dto.member.MembershipPlanVO;
import com.miniprogram.entity.MembershipPlan;
import com.miniprogram.mapper.MembershipPlanMapper;
import com.miniprogram.service.MembershipPlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MembershipPlanServiceImpl extends BaseServiceImpl<MembershipPlanMapper, MembershipPlan>
        implements MembershipPlanService {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final String SCOPE_PLATFORM = "platform";
    private static final String SCOPE_PLANET = "planet";

    @Override
    public List<MembershipPlanVO> listPlans(String scope, String planetId) {
        LambdaQueryWrapper<MembershipPlan> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(scope)) {
            String normalized = normalizeScope(scope);
            wrapper.eq(MembershipPlan::getScope, normalized);
            if (SCOPE_PLANET.equals(normalized) && StringUtils.hasText(planetId)) {
                wrapper.eq(MembershipPlan::getPlanetId, planetId.trim());
            }
        } else if (StringUtils.hasText(planetId)) {
            wrapper.eq(MembershipPlan::getPlanetId, planetId.trim());
        }
        wrapper.orderByAsc(MembershipPlan::getSortOrder)
                .orderByAsc(MembershipPlan::getId);
        return this.list(wrapper).stream().map(this::toVO).collect(Collectors.toList());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MembershipPlanVO createPlan(MembershipPlanDTO dto) {
        validateDto(dto, true);
        MembershipPlan plan = new MembershipPlan();
        applyDto(plan, dto, true);
        this.save(plan);
        return toVO(plan);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MembershipPlanVO updatePlan(Long id, MembershipPlanDTO dto) {
        MembershipPlan existing = getExisting(id);
        // 更新时若未传 scope，沿用原值再校验
        if (!StringUtils.hasText(dto.getScope())) {
            dto.setScope(existing.getScope());
        }
        if (SCOPE_PLANET.equals(normalizeScope(dto.getScope())) && !StringUtils.hasText(dto.getPlanetId())) {
            dto.setPlanetId(existing.getPlanetId());
        }
        validateDto(dto, false);
        applyDto(existing, dto, false);
        this.updateById(existing);
        return toVO(existing);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deletePlan(Long id) {
        getExisting(id);
        this.removeById(id);
    }

    private MembershipPlan getExisting(Long id) {
        MembershipPlan plan = this.getById(id);
        if (plan == null) {
            throw new BusinessException(500411, "付费会员档不存在");
        }
        return plan;
    }

    private void validateDto(MembershipPlanDTO dto, boolean creating) {
        if (creating && !StringUtils.hasText(dto.getName())) {
            throw new BusinessException(500412, "档位名称不能为空");
        }
        if (dto.getName() != null && dto.getName().isBlank()) {
            throw new BusinessException(500412, "档位名称不能为空");
        }
        if (!StringUtils.hasText(dto.getScope())) {
            throw new BusinessException(500413, "scope 不能为空");
        }
        String scope = normalizeScope(dto.getScope());
        if (!SCOPE_PLATFORM.equals(scope) && !SCOPE_PLANET.equals(scope)) {
            throw new BusinessException(500414, "scope 必须为 platform 或 planet");
        }
        if (SCOPE_PLANET.equals(scope)) {
            if (!StringUtils.hasText(dto.getPlanetId())) {
                throw new BusinessException(500415, "星球档必须指定 planetId");
            }
        } else {
            if (StringUtils.hasText(dto.getPlanetId())) {
                throw new BusinessException(500416, "平台档不能设置 planetId");
            }
            int giftDays = dto.getGiftPlanetDays() == null ? 0 : dto.getGiftPlanetDays();
            if (giftDays > 0 && !StringUtils.hasText(dto.getGiftPlanetId())) {
                throw new BusinessException(500417, "平台档赠送天数大于 0 时必须指定 giftPlanetId");
            }
            if (giftDays < 0) {
                throw new BusinessException(500418, "赠送天数不能为负数");
            }
        }
        if (dto.getDiscountRate() != null
                && (dto.getDiscountRate().signum() < 0 || dto.getDiscountRate().compareTo(BigDecimal.ONE) > 0)) {
            throw new BusinessException(500419, "折扣率必须在 0-1 之间");
        }
    }

    private void applyDto(MembershipPlan plan, MembershipPlanDTO dto, boolean creating) {
        String scope = normalizeScope(dto.getScope());
        plan.setScope(scope);

        if (SCOPE_PLANET.equals(scope)) {
            plan.setPlanetId(dto.getPlanetId().trim());
            // 星球档不配置平台赠送 / 商城折扣语义
            plan.setGiftPlanetId(null);
            plan.setGiftPlanetDays(0);
            if (dto.getDiscountRate() != null) {
                plan.setDiscountRate(dto.getDiscountRate());
            } else if (creating) {
                plan.setDiscountRate(null);
            }
        } else {
            plan.setPlanetId(null);
            if (dto.getGiftPlanetDays() != null) {
                plan.setGiftPlanetDays(dto.getGiftPlanetDays());
            } else if (creating) {
                plan.setGiftPlanetDays(0);
            }
            int giftDays = plan.getGiftPlanetDays() == null ? 0 : plan.getGiftPlanetDays();
            if (giftDays > 0) {
                plan.setGiftPlanetId(dto.getGiftPlanetId() != null ? dto.getGiftPlanetId().trim() : plan.getGiftPlanetId());
            } else {
                plan.setGiftPlanetId(null);
            }
            if (dto.getDiscountRate() != null) {
                plan.setDiscountRate(dto.getDiscountRate());
            }
        }

        if (dto.getName() != null) {
            plan.setName(dto.getName().trim());
        }
        if (dto.getIcon() != null) {
            plan.setIcon(dto.getIcon());
        }
        if (dto.getDescription() != null) {
            plan.setDescription(dto.getDescription());
        }
        if (dto.getRights() != null || creating) {
            plan.setRights(dto.getRights());
        }
        if (dto.getShowBadge() != null) {
            plan.setShowBadge(dto.getShowBadge() != 0 ? 1 : 0);
        } else if (creating && plan.getShowBadge() == null) {
            plan.setShowBadge(0);
        }
        if (dto.getExpireRemindDays() != null) {
            plan.setExpireRemindDays(Math.max(0, dto.getExpireRemindDays()));
        } else if (creating && plan.getExpireRemindDays() == null) {
            plan.setExpireRemindDays(0);
        }
        if (dto.getSortOrder() != null) {
            plan.setSortOrder(dto.getSortOrder());
        } else if (creating && plan.getSortOrder() == null) {
            plan.setSortOrder(0);
        }
        if (dto.getStatus() != null) {
            plan.setStatus(dto.getStatus());
        } else if (creating && plan.getStatus() == null) {
            plan.setStatus(1);
        }
    }

    private String normalizeScope(String scope) {
        return scope == null ? "" : scope.trim().toLowerCase();
    }

    private MembershipPlanVO toVO(MembershipPlan plan) {
        MembershipPlanVO vo = new MembershipPlanVO();
        vo.setId(plan.getId());
        vo.setScope(plan.getScope());
        vo.setPlanetId(plan.getPlanetId());
        vo.setName(plan.getName());
        vo.setIcon(plan.getIcon());
        vo.setDescription(plan.getDescription());
        vo.setRights(plan.getRights());
        vo.setDiscountRate(plan.getDiscountRate());
        vo.setGiftPlanetId(plan.getGiftPlanetId());
        vo.setGiftPlanetDays(plan.getGiftPlanetDays() == null ? 0 : plan.getGiftPlanetDays());
        vo.setShowBadge(plan.getShowBadge() == null ? 0 : plan.getShowBadge());
        vo.setExpireRemindDays(plan.getExpireRemindDays() == null ? 0 : plan.getExpireRemindDays());
        vo.setSortOrder(plan.getSortOrder());
        vo.setStatus(plan.getStatus());
        if (plan.getCreateTime() != null) {
            vo.setCreatedAt(plan.getCreateTime().format(FORMATTER));
        }
        if (plan.getUpdateTime() != null) {
            vo.setUpdatedAt(plan.getUpdateTime().format(FORMATTER));
        }
        return vo;
    }
}
