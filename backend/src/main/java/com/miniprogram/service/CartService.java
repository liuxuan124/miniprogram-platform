package com.miniprogram.service;

import com.miniprogram.dto.CartDTO;
import com.miniprogram.dto.CartItemVO;
import com.miniprogram.entity.Cart;

import java.util.List;
import com.baomidou.mybatisplus.extension.service.IService;

/**
 * 购物车 Service
 */
public interface CartService extends IService<Cart> {

    /**
     * 获取用户购物车列表
     */
    List<CartItemVO> getCartList(Long userId);

    /**
     * 添加到购物车
     */
    CartItemVO addToCart(Long userId, CartDTO dto);

    /**
     * 更新购物车项
     */
    CartItemVO updateCartItem(Long userId, Long cartId, CartDTO dto);

    /**
     * 删除购物车项
     */
    void deleteCartItem(Long userId, Long cartId);

    /**
     * 清空购物车
     */
    void clearCart(Long userId);
}
