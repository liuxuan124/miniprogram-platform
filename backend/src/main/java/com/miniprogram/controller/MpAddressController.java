package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.UserAddressDTO;
import com.miniprogram.dto.UserAddressVO;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.UserAddressService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/mp/addresses")
@RequiredArgsConstructor
@Tag(name = "小程序端-收货地址")
public class MpAddressController {

    private final UserAddressService userAddressService;

    @GetMapping
    @Operation(summary = "地址列表")
    public R<List<UserAddressVO>> list() {
        return R.ok(userAddressService.listByUser(SecurityUtils.getCurrentUserId()));
    }

    @PostMapping
    @Operation(summary = "新增地址")
    public R<UserAddressVO> create(@Valid @RequestBody UserAddressDTO dto) {
        return R.ok(userAddressService.create(SecurityUtils.getCurrentUserId(), dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新地址")
    public R<UserAddressVO> update(@PathVariable Long id, @Valid @RequestBody UserAddressDTO dto) {
        return R.ok(userAddressService.update(SecurityUtils.getCurrentUserId(), id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除地址")
    public R<Void> delete(@PathVariable Long id) {
        userAddressService.delete(SecurityUtils.getCurrentUserId(), id);
        return R.ok(null);
    }

    @PutMapping("/{id}/default")
    @Operation(summary = "设为默认地址")
    public R<Void> setDefault(@PathVariable Long id) {
        userAddressService.setDefault(SecurityUtils.getCurrentUserId(), id);
        return R.ok(null);
    }
}
