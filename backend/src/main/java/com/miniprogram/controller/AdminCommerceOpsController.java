package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.service.CommerceOpsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/commerce-ops")
@RequiredArgsConstructor
@Tag(name = "后台-商业变现运营台")
public class AdminCommerceOpsController {

    private final CommerceOpsService commerceOpsService;

    @GetMapping("/overview")
    @Operation(summary = "收入概览聚合")
    @PreAuthorize("hasAuthority('order:list') or hasAuthority('product:list')")
    public R<Map<String, Object>> overview() {
        return R.ok(commerceOpsService.overview());
    }

    @PostMapping("/orders/recall")
    @PreAuthorize("hasAuthority('order:list')")
    public R<Map<String, Object>> recall(@RequestBody Map<String, Object> body) {
        return R.ok(commerceOpsService.recall(body));
    }

    @PutMapping("/products/{id}/test-flag")
    @PreAuthorize("hasAuthority('product:list') or hasAuthority('product:update')")
    public R<Void> productTest(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        commerceOpsService.setProductTestFlag(id, bool(body.get("isTest")));
        return R.ok();
    }

    @PutMapping("/orders/{id}/test-flag")
    @PreAuthorize("hasAuthority('order:list')")
    public R<Void> orderTest(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        commerceOpsService.setOrderTestFlag(id, bool(body.get("isTest")));
        return R.ok();
    }

    @GetMapping("/flash-prices")
    @PreAuthorize("hasAuthority('product:list')")
    public R<List<Map<String, Object>>> flashList() {
        return R.ok(commerceOpsService.listFlashPrices());
    }

    @PostMapping("/flash-prices")
    @PreAuthorize("hasAuthority('product:list') or hasAuthority('product:update')")
    public R<Map<String, Object>> flashCreate(@RequestBody Map<String, Object> body) {
        return R.ok(commerceOpsService.createFlashPrice(body));
    }

    @PutMapping("/flash-prices/{id}")
    @PreAuthorize("hasAuthority('product:list') or hasAuthority('product:update')")
    public R<Map<String, Object>> flashUpdate(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return R.ok(commerceOpsService.updateFlashPrice(id, body));
    }

    @DeleteMapping("/flash-prices/{id}")
    @PreAuthorize("hasAuthority('product:list') or hasAuthority('product:update')")
    public R<Void> flashDelete(@PathVariable Long id) {
        commerceOpsService.deleteFlashPrice(id);
        return R.ok();
    }

    @GetMapping("/settings")
    @PreAuthorize("hasAuthority('product:list') or hasAuthority('order:list')")
    public R<Map<String, Object>> settings() {
        return R.ok(commerceOpsService.getSettings());
    }

    @PutMapping("/settings")
    @PreAuthorize("hasAuthority('product:list') or hasAuthority('order:list')")
    public R<Map<String, Object>> putSettings(@RequestBody Map<String, Object> body) {
        return R.ok(commerceOpsService.putSettings(body));
    }

    @GetMapping("/health")
    @PreAuthorize("hasAuthority('order:list') or hasAuthority('product:list')")
    public R<Map<String, Object>> health() {
        return R.ok(commerceOpsService.health());
    }

    private static boolean bool(Object v) {
        if (v == null) return false;
        if (v instanceof Boolean b) return b;
        String s = String.valueOf(v);
        return "1".equals(s) || "true".equalsIgnoreCase(s);
    }
}
