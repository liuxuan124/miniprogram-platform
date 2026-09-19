package com.miniprogram.controller;

import com.miniprogram.annotation.OperationLog;
import com.miniprogram.common.R;
import com.miniprogram.dto.miniapp.WxPushTargetDTO;
import com.miniprogram.entity.WxPushTarget;
import com.miniprogram.service.WxPushTargetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "微信推送目标", description = "按 AppID 配置体验版推送目标；与整店模板套用无关")
@RestController
@RequestMapping("/api/v1/admin/wx-push-targets")
@RequiredArgsConstructor
public class WxPushTargetController {

    private final WxPushTargetService wxPushTargetService;

    @Operation(summary = "推送目标列表（启用）")
    @GetMapping
    @PreAuthorize("hasAuthority('page:list')")
    public R<List<WxPushTarget>> listEnabled() {
        return R.ok(wxPushTargetService.listEnabled());
    }

    @Operation(summary = "推送目标全部（含停用）")
    @GetMapping("/all")
    @PreAuthorize("hasAuthority('page:list')")
    public R<List<WxPushTarget>> listAll() {
        return R.ok(wxPushTargetService.listAll());
    }

    @Operation(summary = "密钥文件路径说明")
    @GetMapping("/key-path-hint")
    @PreAuthorize("hasAuthority('page:list')")
    public R<Map<String, String>> keyPathHint() {
        return R.ok(Map.of(
                "recommendedPath", "/opt/miniprogram-platform/secrets/wx-upload-{appid}.key",
                "systemConfigKey", "wx_upload_key_path",
                "note", "生产机可不把私钥写进数据库：把 PEM 放到服务器文件，填 uploadKeyPath；或配置 system_config.wx_upload_key_path。套用整店模板不会用到此密钥。"
        ));
    }

    @Operation(summary = "新建推送目标")
    @PostMapping
    @OperationLog("新建微信推送目标")
    @PreAuthorize("hasAuthority('page:publish')")
    public R<WxPushTarget> create(@Valid @RequestBody WxPushTargetDTO dto) {
        return R.ok(wxPushTargetService.create(dto));
    }

    @Operation(summary = "更新推送目标")
    @PutMapping("/{id}")
    @OperationLog("更新微信推送目标")
    @PreAuthorize("hasAuthority('page:publish')")
    public R<WxPushTarget> update(@PathVariable Long id, @Valid @RequestBody WxPushTargetDTO dto) {
        return R.ok(wxPushTargetService.update(id, dto));
    }

    @Operation(summary = "设为默认推送目标")
    @PutMapping("/{id}/default")
    @OperationLog("设默认微信推送目标")
    @PreAuthorize("hasAuthority('page:publish')")
    public R<Void> setDefault(@PathVariable Long id) {
        wxPushTargetService.setDefault(id);
        return R.ok();
    }

    @Operation(summary = "删除推送目标")
    @DeleteMapping("/{id}")
    @OperationLog("删除微信推送目标")
    @PreAuthorize("hasAuthority('page:publish')")
    public R<Void> delete(@PathVariable Long id) {
        wxPushTargetService.delete(id);
        return R.ok();
    }
}
