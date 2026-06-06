package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.*;
import com.miniprogram.entity.AppointmentSlot;

/**
 * 预约时段 Service
 */
public interface AppointmentSlotService extends BaseService<AppointmentSlot> {

    /**
     * 分页查询预约时段列表
     */
    PageResult<AppointmentSlotVO> listAppointmentSlots(AppointmentSlotQueryDTO queryDTO);

    /**
     * 创建预约时段
     */
    AppointmentSlotVO createAppointmentSlot(AppointmentSlotDTO dto);

    /**
     * 更新预约时段
     */
    AppointmentSlotVO updateAppointmentSlot(Long id, AppointmentSlotDTO dto);
}
