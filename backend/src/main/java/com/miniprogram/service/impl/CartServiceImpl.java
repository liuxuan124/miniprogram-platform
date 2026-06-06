package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.dto.CartDTO;
import com.miniprogram.dto.CartItemVO;
import com.miniprogram.entity.Cart;
import com.miniprogram.entity.Product;
import com.miniprogram.entity.ProductSku;
import com.miniprogram.mapper.CartMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.mapper.ProductSkuMapper;
import com.miniprogram.service.CartService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * 购物车 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CartServiceImpl extends BaseServiceImpl<CartMapper, Cart>
        implements CartService {

    private final ProductMapper productMapper;
    private final ProductSkuMapper productSkuMapper;

    @Override
    public List<CartItemVO> getCartList(Long userId) {
        List<Cart> cartItems = this.list(new LambdaQueryWrapper<Cart>()
                .eq(Cart::getUserId, userId)
                .orderByDesc(Cart::getCreatedAt));

        List<CartItemVO> result = new ArrayList<>();
        for (Cart cart : cartItems) {
            CartItemVO vo = convertToVO(cart);
            if (vo != null) {
                result.add(vo);
            }
        }
        return result;
    }

    @Override
    public CartItemVO addToCart(Long userId, CartDTO dto) {
        // 校验商品
        Product product = productMapper.selectById(dto.getProductId());
        if (product == null) {
            throw new BusinessException(500401, "商品不存在");
        }
        if (!"on_sale".equals(product.getStatus())) {
            throw new BusinessException(500201, "商品已下架");
        }

        // 校验SKU
        if (dto.getSkuId() != null) {
            ProductSku sku = productSkuMapper.selectById(dto.getSkuId());
            if (sku == null || !sku.getProductId().equals(dto.getProductId())) {
                throw new BusinessException(500401, "商品SKU不存在");
            }
        }

        // 查找是否已存在
        LambdaQueryWrapper<Cart> wrapper = new LambdaQueryWrapper<Cart>()
                .eq(Cart::getUserId, userId)
                .eq(Cart::getProductId, dto.getProductId());

        if (dto.getSkuId() != null) {
            wrapper.eq(Cart::getSkuId, dto.getSkuId());
        } else {
            wrapper.isNull(Cart::getSkuId);
        }

        Cart existing = this.getOne(wrapper);
        if (existing != null) {
            // 已存在则增加数量
            existing.setQuantity(existing.getQuantity() + dto.getQuantity());
            if (dto.getSelected() != null) {
                existing.setSelected(dto.getSelected());
            }
            this.updateById(existing);
            return convertToVO(existing);
        }

        // 新增购物车项
        Cart cart = new Cart();
        cart.setUserId(userId);
        cart.setProductId(dto.getProductId());
        cart.setSkuId(dto.getSkuId());
        cart.setQuantity(dto.getQuantity());
        cart.setSelected(dto.getSelected() != null ? dto.getSelected() : 1);
        this.save(cart);

        return convertToVO(cart);
    }

    @Override
    public CartItemVO updateCartItem(Long userId, Long cartId, CartDTO dto) {
        Cart cart = getExistingCart(cartId, userId);

        if (dto.getQuantity() != null) {
            cart.setQuantity(dto.getQuantity());
        }
        if (dto.getSelected() != null) {
            cart.setSelected(dto.getSelected());
        }
        this.updateById(cart);

        return convertToVO(cart);
    }

    @Override
    public void deleteCartItem(Long userId, Long cartId) {
        Cart cart = getExistingCart(cartId, userId);
        this.removeById(cart.getId());
    }

    @Override
    public void clearCart(Long userId) {
        this.remove(new LambdaQueryWrapper<Cart>()
                .eq(Cart::getUserId, userId));
    }

    private Cart getExistingCart(Long cartId, Long userId) {
        Cart cart = this.getById(cartId);
        if (cart == null || !cart.getUserId().equals(userId)) {
            throw new BusinessException(500401, "购物车项不存在");
        }
        return cart;
    }

    private CartItemVO convertToVO(Cart cart) {
        CartItemVO vo = new CartItemVO();
        vo.setId(cart.getId());
        vo.setProductId(cart.getProductId());
        vo.setSkuId(cart.getSkuId());
        vo.setQuantity(cart.getQuantity());
        vo.setSelected(cart.getSelected());

        // 填充商品信息
        Product product = productMapper.selectById(cart.getProductId());
        if (product == null) {
            return null;
        }
        vo.setProductName(product.getName());
        vo.setProductImage(product.getMainImage());
        vo.setProductStatus(product.getStatus());
        vo.setPrice(product.getPrice());
        vo.setOriginalPrice(product.getOriginalPrice());
        vo.setStock(product.getStock());

        // 填充SKU信息
        if (cart.getSkuId() != null) {
            ProductSku sku = productSkuMapper.selectById(cart.getSkuId());
            if (sku != null) {
                vo.setSkuName(sku.getSkuName());
                vo.setSkuImage(sku.getSkuImage());
                vo.setPrice(sku.getPrice());
                vo.setOriginalPrice(sku.getOriginalPrice());
                vo.setStock(sku.getStock());
            }
        }

        return vo;
    }
}
