package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.CartDTO;
import com.miniprogram.dto.CartItemVO;
import com.miniprogram.entity.Cart;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.CartService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 小程序端-购物车接口
 */
@RestController
@RequestMapping("/api/v1/mp/cart")
@RequiredArgsConstructor
@Tag(name = "小程序端-购物车接口")
public class MpCartController {

    private final CartService cartService;

    @GetMapping
    @Operation(summary = "获取购物车列表")
    public R<List<CartItemVO>> getCartList() {
        Long userId = SecurityUtils.getCurrentUserId();
        return R.ok(cartService.getCartList(userId));
    }

    @PostMapping
    @Operation(summary = "添加到购物车")
    public R<CartItemVO> addToCart(@Valid @RequestBody CartDTO dto) {
        Long userId = SecurityUtils.getCurrentUserId();
        return R.ok(cartService.addToCart(userId, dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新购物车项")
    public R<CartItemVO> updateCartItem(@PathVariable Long id,
                                         @Valid @RequestBody CartDTO dto) {
        Long userId = SecurityUtils.getCurrentUserId();
        return R.ok(cartService.updateCartItem(userId, id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除购物车项")
    public R<Void> deleteCartItem(@PathVariable Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        cartService.deleteCartItem(userId, id);
        return R.ok(null);
    }
}
