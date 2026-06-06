package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.*;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.AppointmentService2;
import com.miniprogram.service.AppointmentServiceService;
import com.miniprogram.service.FormTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 小程序端表单与预约控制器
 */
@Tag(name = "小程序-表单与预约", description = "小程序端表单提交和预约管理")
@RestController
@RequestMapping("/api/v1/mp")
@RequiredArgsConstructor
public class MpFormAppointmentController {

    private final FormTemplateService formTemplateService;
    private final AppointmentServiceService appointmentServiceService;
    private final AppointmentService2 appointmentService;

    // ==================== 表单相关 ====================

    @Operation(summary = "获取表单模板", description = "小程序端获取表单模板详情（公开）")
    @GetMapping("/form-templates/{id}")
    public R<FormTemplateVO> getFormTemplate(@PathVariable Long id) {
        return R.ok(formTemplateService.getFormTemplateDetail(id));
    }

    @Operation(summary = "提交表单", description = "小程序端提交表单数据")
    @PostMapping("/form-templates/{id}/submit")
    public R<FormDataVO> submitForm(@PathVariable Long id, @Valid @RequestBody FormSubmitDTO submitDTO) {
        Long userId = SecurityUtils.getCurrentUserId();
        return R.ok(formTemplateService.submitForm(id, userId, submitDTO));
    }

    // ==================== 预约相关 ====================

    @Operation(summary = "预约服务列表", description = "小程序端获取预约服务列表（公开）")
    @GetMapping("/appointment-services")
    public R<PageResult<AppointmentServiceVO>> listAppointmentServices(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, defaultValue = "1") Long current,
            @RequestParam(required = false, defaultValue = "10") Long size) {
        AppointmentServiceQueryDTO queryDTO = new AppointmentServiceQueryDTO();
        queryDTO.setKeyword(keyword);
        queryDTO.setStatus(1); // 只查启用的
        queryDTO.setCurrent(current);
        queryDTO.setSize(size);
        return R.ok(appointmentServiceService.listAppointmentServices(queryDTO));
    }

    @Operation(summary = "获取可用时段", description = "小程序端获取指定服务的可用时段")
    @GetMapping("/appointment-services/{id}/slots")
    public R<PageResult<AppointmentSlotVO>> getAvailableSlots(
            @PathVariable Long id,
            @RequestParam(required = false) String date) {
        return R.ok(appointmentServiceService.getAvailableSlots(id, date));
    }

    @Operation(summary = "创建预约", description = "小程序端创建预约")
    @PostMapping("/appointments")
    public R<AppointmentVO> createAppointment(@Valid @RequestBody AppointmentCreateDTO dto) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        return R.ok(appointmentService.createAppointment(userId, dto));
    }

    @Operation(summary = "我的预约", description = "小程序端获取我的预约列表")
    @GetMapping("/appointments")
    public R<PageResult<AppointmentVO>> listMyAppointments(AppointmentQueryDTO queryDTO) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        return R.ok(appointmentService.listMyAppointments(userId, queryDTO));
    }

    @Operation(summary = "取消预约", description = "小程序端取消我的预约")
    @PutMapping("/appointments/{id}/cancel")
    public R<AppointmentVO> cancelMyAppointment(@PathVariable Long id, @RequestBody(required = false) AppointmentCancelDTO dto) {
        Long userId = SecurityUtils.getRequiredCurrentUserId();
        return R.ok(appointmentService.cancelMyAppointment(id, userId, dto));
    }
}
