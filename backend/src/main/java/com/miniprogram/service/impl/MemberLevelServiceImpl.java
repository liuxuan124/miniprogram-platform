package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.dto.member.MemberLevelDTO;
import com.miniprogram.dto.member.MemberLevelVO;
import com.miniprogram.entity.Coupon;
import com.miniprogram.entity.MemberLevel;
import com.miniprogram.mapper.CouponMapper;
import com.miniprogram.mapper.MemberLevelMapper;
import com.miniprogram.member.MemberBenefitCodes;
import com.miniprogram.service.MemberLevelService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberLevelServiceImpl extends BaseServiceImpl<MemberLevelMapper, MemberLevel>
        implements MemberLevelService {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final CouponMapper couponMapper;

    @Override
    public List<MemberLevelVO> listAll() {
        LambdaQueryWrapper<MemberLevel> wrapper = new LambdaQueryWrapper<>();
        wrapper.orderByAsc(MemberLevel::getSortOrder)
               .orderByAsc(MemberLevel::getMinPoints);
        return this.list(wrapper).stream().map(this::convertToVO).collect(Collectors.toList());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MemberLevelVO createLevel(MemberLevelDTO dto) {
        if (dto.getName() == null || dto.getName().isBlank()) {
            throw new BusinessException(500400, "等级名称不能为空");
        }
        if (dto.getMinPoints() == null) {
            throw new BusinessException(500400, "最低积分要求不能为空");
        }
        validateLevel(dto);
        MemberLevel level = new MemberLevel();
        applyDto(level, dto, true);
        if (level.getStatus() == null) {
            level.setStatus(1);
        }
        if (level.getPointsRate() == null) {
            level.setPointsRate(BigDecimal.ONE);
        }
        this.save(level);
        return convertToVO(level);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MemberLevelVO updateLevel(Long id, MemberLevelDTO dto) {
        MemberLevel existing = getExistingLevel(id);
        validateLevel(dto);
        applyDto(existing, dto, false);
        this.updateById(existing);
        return convertToVO(existing);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteLevel(Long id) {
        getExistingLevel(id);
        this.removeById(id);
    }

    @Override
    public MemberLevel calculateLevel(Integer points) {
        if (points == null || points < 0) {
            return null;
        }
        LambdaQueryWrapper<MemberLevel> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(MemberLevel::getStatus, 1)
               .le(MemberLevel::getMinPoints, points)
               .orderByDesc(MemberLevel::getMinPoints)
               .last("LIMIT 1");
        return this.getOne(wrapper);
    }

    private MemberLevel getExistingLevel(Long id) {
        MemberLevel level = this.getById(id);
        if (level == null) {
            throw new BusinessException(500401, "会员等级不存在");
        }
        return level;
    }

    private void applyDto(MemberLevel level, MemberLevelDTO dto, boolean creating) {
        if (dto.getName() != null) level.setName(dto.getName());
        if (dto.getIcon() != null) level.setIcon(dto.getIcon());
        if (dto.getMinPoints() != null) level.setMinPoints(dto.getMinPoints());
        if (dto.getDiscountRate() != null) level.setDiscountRate(dto.getDiscountRate());
        if (dto.getPointsRate() != null) level.setPointsRate(dto.getPointsRate());
        if (dto.getSortOrder() != null) level.setSortOrder(dto.getSortOrder());
        if (dto.getStatus() != null) level.setStatus(dto.getStatus());

        List<String> benefits = dto.getBenefits() != null ? dto.getBenefits() : dto.getRights();
        if (benefits != null || creating) {
            List<String> normalized = MemberBenefitCodes.normalize(benefits);
            level.setRights(normalized);
            if (!MemberBenefitCodes.has(normalized, MemberBenefitCodes.BIRTHDAY_GIFT)) {
                level.setBirthdayCouponId(null);
            } else if (dto.getBirthdayCouponId() != null) {
                level.setBirthdayCouponId(dto.getBirthdayCouponId());
            }
        } else if (dto.getBirthdayCouponId() != null) {
            level.setBirthdayCouponId(dto.getBirthdayCouponId());
        }
    }

    private void validateLevel(MemberLevelDTO dto) {
        if (dto.getMinPoints() != null && dto.getMinPoints() < 0) {
            throw new BusinessException(500402, "最低积分不能为负数");
        }
        if (dto.getDiscountRate() != null
                && (dto.getDiscountRate().signum() < 0 || dto.getDiscountRate().doubleValue() > 1)) {
            throw new BusinessException(500403, "折扣率必须在0-1之间");
        }
        if (dto.getPointsRate() != null && dto.getPointsRate().compareTo(BigDecimal.ONE) < 0) {
            throw new BusinessException(500404, "积分倍率不能小于1");
        }

        List<String> benefits = MemberBenefitCodes.normalize(
                dto.getBenefits() != null ? dto.getBenefits() : dto.getRights());
        if (MemberBenefitCodes.has(benefits, MemberBenefitCodes.BIRTHDAY_GIFT)) {
            Long couponId = dto.getBirthdayCouponId();
            if (couponId == null) {
                throw new BusinessException(500405, "生日礼包需绑定一张优惠券");
            }
            Coupon coupon = couponMapper.selectById(couponId);
            if (coupon == null) {
                throw new BusinessException(500406, "生日礼包绑定的优惠券不存在");
            }
        }
    }

    private MemberLevelVO convertToVO(MemberLevel level) {
        MemberLevelVO vo = new MemberLevelVO();
        vo.setId(level.getId());
        vo.setName(level.getName());
        vo.setIcon(level.getIcon());
        vo.setMinPoints(level.getMinPoints());
        vo.setDiscountRate(level.getDiscountRate());
        vo.setPointsRate(level.getPointsRate() != null ? level.getPointsRate() : BigDecimal.ONE);
        vo.setBirthdayCouponId(level.getBirthdayCouponId());
        vo.setSortOrder(level.getSortOrder());
        vo.setStatus(level.getStatus());
        List<String> benefits = MemberBenefitCodes.normalize(level.getRights());
        // 旧数据：非权益码文案保留在 rights，benefits 仅输出已知码
        if (benefits.isEmpty() && level.getRights() != null && !level.getRights().isEmpty()) {
            vo.setRights(level.getRights());
            vo.setBenefits(Collections.emptyList());
        } else {
            vo.setBenefits(benefits);
            vo.setRights(benefits);
        }
        if (level.getCreateTime() != null) {
            vo.setCreatedAt(level.getCreateTime().format(FORMATTER));
        }
        if (level.getUpdateTime() != null) {
            vo.setUpdatedAt(level.getUpdateTime().format(FORMATTER));
        }
        return vo;
    }
}
