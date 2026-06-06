package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.*;
import com.miniprogram.entity.AppointmentSlot;
import com.miniprogram.mapper.AppointmentSlotMapper;
import com.miniprogram.service.AppointmentServiceService;
import com.miniprogram.service.AppointmentSlotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;

/**
 * 预约服务 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AppointmentServiceServiceImpl extends BaseServiceImpl<com.miniprogram.mapper.AppointmentServiceMapper, com.miniprogram.entity.AppointmentService> implements AppointmentServiceService {

    private final AppointmentSlotService appointmentSlotService;

    @Override
    public PageResult<AppointmentServiceVO> listAppointmentServices(AppointmentServiceQueryDTO queryDTO) {
        LambdaQueryWrapper<com.miniprogram.entity.AppointmentService> wrapper = new LambdaQueryWrapper<>();
        wrapper.like(StringUtils.hasText(queryDTO.getKeyword()), com.miniprogram.entity.AppointmentService::getName, queryDTO.getKeyword());
        wrapper.eq(queryDTO.getStatus() != null, com.miniprogram.entity.AppointmentService::getStatus, queryDTO.getStatus());
        wrapper.orderByDesc(com.miniprogram.entity.AppointmentService::getUpdateTime);

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<com.miniprogram.entity.AppointmentService> page =
                this.page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(queryDTO.getCurrent(), queryDTO.getSize()), wrapper);

        PageResult<AppointmentServiceVO> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setCurrent(page.getCurrent());
        result.setSize(page.getSize());
        result.setRecords(page.getRecords().stream().map(this::toVO).toList());
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AppointmentServiceVO createAppointmentService(AppointmentServiceDTO dto) {
        com.miniprogram.entity.AppointmentService service = new com.miniprogram.entity.AppointmentService();
        BeanUtils.copyProperties(dto, service);
        if (service.getStatus() == null) {
            service.setStatus(1); // 默认启用
        }
        this.save(service);
        return toVO(service);
    }

    @Override
    public AppointmentServiceVO getAppointmentServiceDetail(Long id) {
        com.miniprogram.entity.AppointmentService service = getExistingService(id);
        return toVO(service);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AppointmentServiceVO updateAppointmentService(Long id, AppointmentServiceDTO dto) {
        com.miniprogram.entity.AppointmentService service = getExistingService(id);

        if (StringUtils.hasText(dto.getName())) {
            service.setName(dto.getName());
        }
        if (dto.getDescription() != null) {
            service.setDescription(dto.getDescription());
        }
        if (dto.getImage() != null) {
            service.setImage(dto.getImage());
        }
        if (dto.getDuration() != null) {
            service.setDuration(dto.getDuration());
        }
        if (dto.getPrice() != null) {
            service.setPrice(dto.getPrice());
        }
        if (dto.getStatus() != null) {
            service.setStatus(dto.getStatus());
        }

        this.updateById(service);
        return toVO(service);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteAppointmentService(Long id) {
        getExistingService(id);
        this.removeById(id);
    }

    @Override
    public PageResult<AppointmentSlotVO> getAvailableSlots(Long serviceId, String date) {
        getExistingService(serviceId);

        LambdaQueryWrapper<AppointmentSlot> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AppointmentSlot::getServiceId, serviceId);
        wrapper.eq(AppointmentSlot::getStatus, 1); // 只查启用的时段
        if (StringUtils.hasText(date)) {
            wrapper.eq(AppointmentSlot::getDate, LocalDate.parse(date));
        }
        wrapper.ge(AppointmentSlot::getDate, LocalDate.now()); // 不查过去的日期
        wrapper.orderByAsc(AppointmentSlot::getDate);
        wrapper.orderByAsc(AppointmentSlot::getStartTime);

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<AppointmentSlot> page =
                appointmentSlotService.page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(1, 100), wrapper);

        PageResult<AppointmentSlotVO> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setCurrent(page.getCurrent());
        result.setSize(page.getSize());
        result.setRecords(page.getRecords().stream().map(this::toSlotVO).toList());
        return result;
    }

    // ==================== 私有方法 ====================

    private com.miniprogram.entity.AppointmentService getExistingService(Long id) {
        com.miniprogram.entity.AppointmentService service = this.getById(id);
        if (service == null) {
            throw new BusinessException(900401, "预约服务不存在");
        }
        return service;
    }

    private AppointmentServiceVO toVO(com.miniprogram.entity.AppointmentService service) {
        AppointmentServiceVO vo = new AppointmentServiceVO();
        BeanUtils.copyProperties(service, vo);
        vo.setStatusDesc(AppointmentServiceVO.getStatusDesc(service.getStatus()));
        return vo;
    }

    private AppointmentSlotVO toSlotVO(AppointmentSlot slot) {
        AppointmentSlotVO vo = new AppointmentSlotVO();
        BeanUtils.copyProperties(slot, vo);
        vo.setRemainingCapacity(slot.getMaxCapacity() - slot.getBookedCount());
        vo.setStatusDesc(AppointmentSlotVO.getStatusDesc(slot.getStatus()));
        return vo;
    }
}
