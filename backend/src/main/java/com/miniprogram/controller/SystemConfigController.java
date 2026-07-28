package com.miniprogram.controller;

import com.miniprogram.annotation.OperationLog;
import com.miniprogram.common.R;
import com.miniprogram.dto.system.ConfigBatchUpdateDTO;
import com.miniprogram.dto.system.ConfigVO;
import com.miniprogram.dto.system.WxPayConfigTestVO;
import com.miniprogram.dto.system.WxPayPrivateKeyUploadVO;
import com.miniprogram.service.SystemConfigService;
import com.miniprogram.service.WxPayConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 后台-系统配置管理
 */
@RestController
@RequestMapping("/api/v1/admin/system/configs")
@RequiredArgsConstructor
@Tag(name = "后台-系统配置管理")
public class SystemConfigController {

    private final SystemConfigService systemConfigService;
    private final WxPayConfigService wxPayConfigService;

    @GetMapping
    @Operation(summary = "获取所有配置列表")
    @OperationLog("获取系统配置列表")
    public R<List<ConfigVO>> listConfigs() {
        return R.ok(systemConfigService.listAllConfigs());
    }

    @GetMapping("/{group}")
    @Operation(summary = "按组获取配置")
    @OperationLog("按组获取系统配置")
    public R<List<ConfigVO>> listConfigsByGroup(@PathVariable String group) {
        return R.ok(systemConfigService.listConfigsByGroup(group));
    }

    @PutMapping
    @Operation(summary = "批量更新配置")
    @OperationLog("批量更新系统配置")
    public R<Void> batchUpdateConfigs(@Valid @RequestBody ConfigBatchUpdateDTO dto) {
        systemConfigService.batchUpdateConfigs(dto);
        return R.ok(null);
    }

    @PostMapping("/wx-pay-private-key")
    @Operation(summary = "上传微信支付商户私钥")
    @OperationLog("上传微信支付商户私钥")
    public R<WxPayPrivateKeyUploadVO> uploadWxPayPrivateKey(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "password", required = false) String password) {
        return R.ok(wxPayConfigService.savePrivateKey(file, password));
    }

    @PostMapping("/wx-pay-test")
    @Operation(summary = "验证微信支付生产配置")
    @OperationLog("验证微信支付生产配置")
    public R<WxPayConfigTestVO> testWxPayConfig() {
        return R.ok(wxPayConfigService.testConnection());
    }
}
