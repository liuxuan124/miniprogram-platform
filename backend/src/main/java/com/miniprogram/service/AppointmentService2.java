package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.*;
import com.miniprogram.entity.Appointment;

/**
 * 预约记录 Service
 */
public interface AppointmentService2 extends BaseService<Appointment> {

    /**
     * 分页查询预约列表（管理后台）
     */
    PageResult<AppointmentVO> listAppointments(AppointmentQueryDTO queryDTO);

    /**
     * 确认预约
     */
    AppointmentVO confirmAppointment(Long id);

    /**
     * 取消预约（管理后台）
     */
    AppointmentVO cancelAppointment(Long id, AppointmentCancelDTO dto);

    /**
     * 创建预约（小程序端）
     */
    AppointmentVO createAppointment(Long userId, AppointmentCreateDTO dto);

    /**
     * 我的预约列表（小程序端）
     */
    PageResult<AppointmentVO> listMyAppointments(Long userId, AppointmentQueryDTO queryDTO);

    /**
     * 取消预约（小程序端）
     */
    AppointmentVO cancelMyAppointment(Long id, Long userId, AppointmentCancelDTO dto);
}
