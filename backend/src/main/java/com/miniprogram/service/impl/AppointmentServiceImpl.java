package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.*;
import com.miniprogram.entity.Appointment;
import com.miniprogram.entity.AppointmentSlot;
import com.miniprogram.mapper.AppointmentMapper;
import com.miniprogram.mapper.AppointmentSlotMapper;
import com.miniprogram.service.AppointmentService2;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 预约记录 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AppointmentServiceImpl extends BaseServiceImpl<AppointmentMapper, Appointment> implements AppointmentService2 {

    private final AppointmentSlotMapper appointmentSlotMapper;
    private final com.miniprogram.mapper.AppointmentServiceMapper appointmentServiceMapper;

    @Override
    public PageResult<AppointmentVO> listAppointments(AppointmentQueryDTO queryDTO) {
        LambdaQueryWrapper<Appointment> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(StringUtils.hasText(queryDTO.getStatus()), Appointment::getStatus, queryDTO.getStatus());
        wrapper.eq(queryDTO.getServiceId() != null, Appointment::getServiceId, queryDTO.getServiceId());
        wrapper.like(StringUtils.hasText(queryDTO.getContactName()), Appointment::getContactName, queryDTO.getContactName());
        if (StringUtils.hasText(queryDTO.getAppointmentDate())) {
            wrapper.eq(Appointment::getAppointmentDate, LocalDate.parse(queryDTO.getAppointmentDate()));
        }
        wrapper.orderByDesc(Appointment::getCreateTime);

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<Appointment> page =
                this.page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(queryDTO.getCurrent(), queryDTO.getSize()), wrapper);

        PageResult<AppointmentVO> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setCurrent(page.getCurrent());
        result.setSize(page.getSize());
        result.setRecords(page.getRecords().stream().map(this::toVO).toList());
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AppointmentVO confirmAppointment(Long id) {
        Appointment appointment = getExistingAppointment(id);

        if (!"pending".equals(appointment.getStatus())) {
            throw new BusinessException(900202, "预约状态错误，只能确认待确认的预约");
        }

        appointment.setStatus("confirmed");
        this.updateById(appointment);

        return toVO(appointment);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AppointmentVO cancelAppointment(Long id, AppointmentCancelDTO dto) {
        Appointment appointment = getExistingAppointment(id);

        if ("cancelled".equals(appointment.getStatus())) {
            throw new BusinessException(900202, "预约已取消，不可重复操作");
        }
        if ("completed".equals(appointment.getStatus())) {
            throw new BusinessException(900202, "预约已完成，不可取消");
        }

        String previousStatus = appointment.getStatus();
        appointment.setStatus("cancelled");
        if (dto != null && StringUtils.hasText(dto.getCancelReason())) {
            appointment.setCancelReason(dto.getCancelReason());
        }
        this.updateById(appointment);

        // 释放时段容量（只有之前是 pending/confirmed 状态才释放）
        if ("pending".equals(previousStatus) || "confirmed".equals(previousStatus)) {
            releaseSlotCapacity(appointment.getSlotId());
        }

        return toVO(appointment);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AppointmentVO createAppointment(Long userId, AppointmentCreateDTO dto) {
        // 校验服务是否存在且启用
        com.miniprogram.entity.AppointmentService service = appointmentServiceMapper.selectById(dto.getServiceId());
        if (service == null) {
            throw new BusinessException(900401, "预约服务不存在");
        }
        if (service.getStatus() != 1) {
            throw new BusinessException(900201, "预约服务已停用");
        }

        // 校验时段是否存在且启用
        AppointmentSlot slot = appointmentSlotMapper.selectById(dto.getSlotId());
        if (slot == null) {
            throw new BusinessException(900401, "预约时段不存在");
        }
        if (slot.getStatus() != 1) {
            throw new BusinessException(900201, "预约时段已停用");
        }

        // 校验时段容量
        if (slot.getBookedCount() >= slot.getMaxCapacity()) {
            throw new BusinessException(900201, "预约时段已满");
        }

        // 占用时段容量（乐观锁方式）
        int updated = appointmentSlotMapper.update(null,
                new LambdaUpdateWrapper<AppointmentSlot>()
                        .eq(AppointmentSlot::getId, dto.getSlotId())
                        .eq(AppointmentSlot::getBookedCount, slot.getBookedCount()) // 乐观锁条件
                        .set(AppointmentSlot::getBookedCount, slot.getBookedCount() + 1)
        );
        if (updated == 0) {
            throw new BusinessException(900201, "预约时段已满");
        }

        // 创建预约记录
        Appointment appointment = new Appointment();
        appointment.setOrderNo(generateOrderNo());
        appointment.setUserId(userId);
        appointment.setServiceId(dto.getServiceId());
        appointment.setSlotId(dto.getSlotId());
        appointment.setAppointmentDate(slot.getDate());
        appointment.setAppointmentTime(slot.getStartTime() + "-" + slot.getEndTime());
        appointment.setStatus("pending");
        appointment.setContactName(dto.getContactName());
        appointment.setContactPhone(dto.getContactPhone());
        appointment.setRemark(dto.getRemark());
        this.save(appointment);

        return toVO(appointment);
    }

    @Override
    public PageResult<AppointmentVO> listMyAppointments(Long userId, AppointmentQueryDTO queryDTO) {
        LambdaQueryWrapper<Appointment> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Appointment::getUserId, userId);
        wrapper.eq(StringUtils.hasText(queryDTO.getStatus()), Appointment::getStatus, queryDTO.getStatus());
        wrapper.orderByDesc(Appointment::getCreateTime);

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<Appointment> page =
                this.page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(queryDTO.getCurrent(), queryDTO.getSize()), wrapper);

        PageResult<AppointmentVO> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setCurrent(page.getCurrent());
        result.setSize(page.getSize());
        result.setRecords(page.getRecords().stream().map(this::toVO).toList());
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AppointmentVO cancelMyAppointment(Long id, Long userId, AppointmentCancelDTO dto) {
        Appointment appointment = getExistingAppointment(id);

        // 校验是否是本人的预约
        if (!appointment.getUserId().equals(userId)) {
            throw new BusinessException(900402, "预约不存在");
        }

        if ("cancelled".equals(appointment.getStatus())) {
            throw new BusinessException(900202, "预约已取消，不可重复操作");
        }
        if ("completed".equals(appointment.getStatus())) {
            throw new BusinessException(900202, "预约已完成，不可取消");
        }

        String previousStatus = appointment.getStatus();
        appointment.setStatus("cancelled");
        if (dto != null && StringUtils.hasText(dto.getCancelReason())) {
            appointment.setCancelReason(dto.getCancelReason());
        }
        this.updateById(appointment);

        // 释放时段容量
        if ("pending".equals(previousStatus) || "confirmed".equals(previousStatus)) {
            releaseSlotCapacity(appointment.getSlotId());
        }

        return toVO(appointment);
    }

    // ==================== 私有方法 ====================

    private Appointment getExistingAppointment(Long id) {
        Appointment appointment = this.getById(id);
        if (appointment == null) {
            throw new BusinessException(900402, "预约不存在");
        }
        return appointment;
    }

    /**
     * 释放时段容量
     */
    private void releaseSlotCapacity(Long slotId) {
        AppointmentSlot slot = appointmentSlotMapper.selectById(slotId);
        if (slot != null && slot.getBookedCount() > 0) {
            slot.setBookedCount(slot.getBookedCount() - 1);
            appointmentSlotMapper.updateById(slot);
        }
    }

    /**
     * 生成预约单号: AP + 日期 + 6位随机数
     */
    private String generateOrderNo() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randomPart = String.format("%06d", ThreadLocalRandom.current().nextInt(1000000));
        return "AP" + datePart + randomPart;
    }

    private AppointmentVO toVO(Appointment appointment) {
        AppointmentVO vo = new AppointmentVO();
        BeanUtils.copyProperties(appointment, vo);
        vo.setStatusDesc(AppointmentVO.getStatusDesc(appointment.getStatus()));

        // 填充服务名称和价格
        try {
            com.miniprogram.entity.AppointmentService service = appointmentServiceMapper.selectById(appointment.getServiceId());
            if (service != null) {
                vo.setServiceName(service.getName());
                vo.setServicePrice(service.getPrice());
                vo.setServiceDuration(service.getDuration());
            }
        } catch (Exception e) {
            log.warn("获取预约服务信息失败, serviceId={}", appointment.getServiceId());
        }

        return vo;
    }
}
