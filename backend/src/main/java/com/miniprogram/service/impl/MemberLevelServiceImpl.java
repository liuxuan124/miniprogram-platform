package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.dto.member.MemberLevelDTO;
import com.miniprogram.dto.member.MemberLevelVO;
import com.miniprogram.entity.MemberLevel;
import com.miniprogram.mapper.MemberLevelMapper;
import com.miniprogram.service.MemberLevelService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 会员等级 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MemberLevelServiceImpl extends BaseServiceImpl<MemberLevelMapper, MemberLevel>
        implements MemberLevelService {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    public List<MemberLevelVO> listAll() {
        LambdaQueryWrapper<MemberLevel> wrapper = new LambdaQueryWrapper<>();
        wrapper.orderByAsc(MemberLevel::getSortOrder)
               .orderByAsc(MemberLevel::getMinPoints);
        List<MemberLevel> list = this.list(wrapper);
        return list.stream().map(this::convertToVO).collect(Collectors.toList());
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
        BeanUtils.copyProperties(dto, level);
        if (level.getStatus() == null) {
            level.setStatus(1);
        }
        this.save(level);
        return convertToVO(level);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MemberLevelVO updateLevel(Long id, MemberLevelDTO dto) {
        MemberLevel existing = getExistingLevel(id);

        if (dto.getName() != null) existing.setName(dto.getName());
        if (dto.getIcon() != null) existing.setIcon(dto.getIcon());
        if (dto.getMinPoints() != null) existing.setMinPoints(dto.getMinPoints());
        if (dto.getDiscountRate() != null) existing.setDiscountRate(dto.getDiscountRate());
        if (dto.getRights() != null) existing.setRights(dto.getRights());
        if (dto.getSortOrder() != null) existing.setSortOrder(dto.getSortOrder());
        if (dto.getStatus() != null) existing.setStatus(dto.getStatus());

        validateLevel(dto);
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

    // ==================== 私有方法 ====================

    private MemberLevel getExistingLevel(Long id) {
        MemberLevel level = this.getById(id);
        if (level == null) {
            throw new BusinessException(500401, "会员等级不存在");
        }
        return level;
    }

    private void validateLevel(MemberLevelDTO dto) {
        if (dto.getMinPoints() != null && dto.getMinPoints() < 0) {
            throw new BusinessException(500402, "最低积分不能为负数");
        }
        if (dto.getDiscountRate() != null
                && (dto.getDiscountRate().signum() < 0 || dto.getDiscountRate().doubleValue() > 1)) {
            throw new BusinessException(500403, "折扣率必须在0-1之间");
        }
    }

    private MemberLevelVO convertToVO(MemberLevel level) {
        MemberLevelVO vo = new MemberLevelVO();
        BeanUtils.copyProperties(level, vo);
        if (level.getCreateTime() != null) {
            vo.setCreatedAt(level.getCreateTime().format(FORMATTER));
        }
        if (level.getUpdateTime() != null) {
            vo.setUpdatedAt(level.getUpdateTime().format(FORMATTER));
        }
        return vo;
    }
}
