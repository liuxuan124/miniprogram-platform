package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.*;
import com.miniprogram.service.AppointmentSlotService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 预约时段管理控制器（管理后台）
 */
@Tag(name = "预约时段管理", description = "预约时段 CRUD")
@RestController
@RequestMapping("/api/v1/admin/appointment-slots")
@RequiredArgsConstructor
public class AppointmentSlotController {

    private final AppointmentSlotService appointmentSlotService;

    @Operation(summary = "预约时段列表", description = "分页查询预约时段列表")
    @GetMapping
    public R<PageResult<AppointmentSlotVO>> listAppointmentSlots(AppointmentSlotQueryDTO queryDTO) {
        return R.ok(appointmentSlotService.listAppointmentSlots(queryDTO));
    }

    @Operation(summary = "创建预约时段", description = "创建新的预约时段")
    @PostMapping
    public R<AppointmentSlotVO> createAppointmentSlot(@Valid @RequestBody AppointmentSlotDTO dto) {
        return R.ok(appointmentSlotService.createAppointmentSlot(dto));
    }

    @Operation(summary = "更新预约时段", description = "更新预约时段信息")
    @PutMapping("/{id}")
    public R<AppointmentSlotVO> updateAppointmentSlot(@PathVariable Long id, @Valid @RequestBody AppointmentSlotDTO dto) {
        return R.ok(appointmentSlotService.updateAppointmentSlot(id, dto));
    }
}
