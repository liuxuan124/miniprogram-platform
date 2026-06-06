package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.*;
import com.miniprogram.entity.AppointmentService;

/**
 * 预约服务 Service
 */
public interface AppointmentServiceService extends BaseService<AppointmentService> {

    /**
     * 分页查询预约服务列表
     */
    PageResult<AppointmentServiceVO> listAppointmentServices(AppointmentServiceQueryDTO queryDTO);

    /**
     * 创建预约服务
     */
    AppointmentServiceVO createAppointmentService(AppointmentServiceDTO dto);

    /**
     * 获取预约服务详情
     */
    AppointmentServiceVO getAppointmentServiceDetail(Long id);

    /**
     * 更新预约服务
     */
    AppointmentServiceVO updateAppointmentService(Long id, AppointmentServiceDTO dto);

    /**
     * 删除预约服务
     */
    void deleteAppointmentService(Long id);

    /**
     * 获取可用时段列表（小程序端）
     */
    PageResult<AppointmentSlotVO> getAvailableSlots(Long serviceId, String date);
}
