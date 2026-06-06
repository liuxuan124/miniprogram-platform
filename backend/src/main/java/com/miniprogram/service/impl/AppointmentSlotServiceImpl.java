package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.*;
import com.miniprogram.entity.AppointmentSlot;
import com.miniprogram.mapper.AppointmentSlotMapper;
import com.miniprogram.service.AppointmentSlotService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;

/**
 * 预约时段 Service 实现
 */
@Slf4j
@Service
public class AppointmentSlotServiceImpl extends BaseServiceImpl<AppointmentSlotMapper, AppointmentSlot> implements AppointmentSlotService {

    @Override
    public PageResult<AppointmentSlotVO> listAppointmentSlots(AppointmentSlotQueryDTO queryDTO) {
        LambdaQueryWrapper<AppointmentSlot> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(queryDTO.getServiceId() != null, AppointmentSlot::getServiceId, queryDTO.getServiceId());
        if (StringUtils.hasText(queryDTO.getDate())) {
            wrapper.eq(AppointmentSlot::getDate, LocalDate.parse(queryDTO.getDate()));
        }
        wrapper.eq(queryDTO.getStatus() != null, AppointmentSlot::getStatus, queryDTO.getStatus());
        wrapper.orderByAsc(AppointmentSlot::getDate);
        wrapper.orderByAsc(AppointmentSlot::getStartTime);

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<AppointmentSlot> page =
                this.page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(queryDTO.getCurrent(), queryDTO.getSize()), wrapper);

        PageResult<AppointmentSlotVO> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setCurrent(page.getCurrent());
        result.setSize(page.getSize());
        result.setRecords(page.getRecords().stream().map(this::toVO).toList());
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AppointmentSlotVO createAppointmentSlot(AppointmentSlotDTO dto) {
        AppointmentSlot slot = new AppointmentSlot();
        BeanUtils.copyProperties(dto, slot);
        if (slot.getMaxCapacity() == null) {
            slot.setMaxCapacity(1);
        }
        slot.setBookedCount(0);
        if (slot.getStatus() == null) {
            slot.setStatus(1);
        }
        this.save(slot);
        return toVO(slot);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AppointmentSlotVO updateAppointmentSlot(Long id, AppointmentSlotDTO dto) {
        AppointmentSlot slot = getExistingSlot(id);

        if (dto.getServiceId() != null) {
            slot.setServiceId(dto.getServiceId());
        }
        if (dto.getDate() != null) {
            slot.setDate(dto.getDate());
        }
        if (StringUtils.hasText(dto.getStartTime())) {
            slot.setStartTime(dto.getStartTime());
        }
        if (StringUtils.hasText(dto.getEndTime())) {
            slot.setEndTime(dto.getEndTime());
        }
        if (dto.getMaxCapacity() != null) {
            // 不能将最大容量设为小于已预约数量
            if (dto.getMaxCapacity() < slot.getBookedCount()) {
                throw new BusinessException(900201, "最大容量不能小于已预约数量(" + slot.getBookedCount() + ")");
            }
            slot.setMaxCapacity(dto.getMaxCapacity());
        }
        if (dto.getStatus() != null) {
            slot.setStatus(dto.getStatus());
        }

        this.updateById(slot);
        return toVO(slot);
    }

    // ==================== 私有方法 ====================

    private AppointmentSlot getExistingSlot(Long id) {
        AppointmentSlot slot = this.getById(id);
        if (slot == null) {
            throw new BusinessException(900401, "预约时段不存在");
        }
        return slot;
    }

    private AppointmentSlotVO toVO(AppointmentSlot slot) {
        AppointmentSlotVO vo = new AppointmentSlotVO();
        BeanUtils.copyProperties(slot, vo);
        vo.setRemainingCapacity(slot.getMaxCapacity() - slot.getBookedCount());
        vo.setStatusDesc(AppointmentSlotVO.getStatusDesc(slot.getStatus()));
        return vo;
    }
}
