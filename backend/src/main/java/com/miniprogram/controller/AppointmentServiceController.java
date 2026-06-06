package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.*;
import com.miniprogram.service.AppointmentServiceService;
import com.miniprogram.service.AppointmentService2;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 预约服务管理控制器（管理后台）
 */
@Tag(name = "预约服务管理", description = "预约服务 CRUD")
@RestController
@RequestMapping("/api/v1/admin/appointment-services")
@RequiredArgsConstructor
public class AppointmentServiceController {

    private final AppointmentServiceService appointmentServiceService;

    @Operation(summary = "预约服务列表", description = "分页查询预约服务列表")
    @GetMapping
    public R<PageResult<AppointmentServiceVO>> listAppointmentServices(AppointmentServiceQueryDTO queryDTO) {
        return R.ok(appointmentServiceService.listAppointmentServices(queryDTO));
    }

    @Operation(summary = "创建预约服务", description = "创建新的预约服务")
    @PostMapping
    public R<AppointmentServiceVO> createAppointmentService(@Valid @RequestBody AppointmentServiceDTO dto) {
        return R.ok(appointmentServiceService.createAppointmentService(dto));
    }

    @Operation(summary = "预约服务详情", description = "获取预约服务详情")
    @GetMapping("/{id}")
    public R<AppointmentServiceVO> getAppointmentServiceDetail(@PathVariable Long id) {
        return R.ok(appointmentServiceService.getAppointmentServiceDetail(id));
    }

    @Operation(summary = "更新预约服务", description = "更新预约服务信息")
    @PutMapping("/{id}")
    public R<AppointmentServiceVO> updateAppointmentService(@PathVariable Long id, @Valid @RequestBody AppointmentServiceDTO dto) {
        return R.ok(appointmentServiceService.updateAppointmentService(id, dto));
    }

    @Operation(summary = "删除预约服务", description = "删除预约服务")
    @DeleteMapping("/{id}")
    public R<Void> deleteAppointmentService(@PathVariable Long id) {
        appointmentServiceService.deleteAppointmentService(id);
        return R.ok();
    }
}
