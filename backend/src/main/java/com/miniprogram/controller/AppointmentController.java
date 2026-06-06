package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.*;
import com.miniprogram.service.AppointmentService2;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 预约管理控制器（管理后台）
 */
@Tag(name = "预约管理", description = "预约列表 + 确认/取消")
@RestController
@RequestMapping("/api/v1/admin/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService2 appointmentService;

    @Operation(summary = "预约列表", description = "分页查询预约记录列表")
    @GetMapping
    public R<PageResult<AppointmentVO>> listAppointments(AppointmentQueryDTO queryDTO) {
        return R.ok(appointmentService.listAppointments(queryDTO));
    }

    @Operation(summary = "确认预约", description = "确认待确认的预约")
    @PutMapping("/{id}/confirm")
    public R<AppointmentVO> confirmAppointment(@PathVariable Long id) {
        return R.ok(appointmentService.confirmAppointment(id));
    }

    @Operation(summary = "取消预约", description = "取消预约")
    @PutMapping("/{id}/cancel")
    public R<AppointmentVO> cancelAppointment(@PathVariable Long id, @RequestBody(required = false) AppointmentCancelDTO dto) {
        return R.ok(appointmentService.cancelAppointment(id, dto));
    }
}
