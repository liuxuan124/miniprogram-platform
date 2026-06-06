package com.miniprogram.service;

import com.miniprogram.dto.ProductSkuDTO;
import com.miniprogram.dto.ProductSkuVO;
import com.miniprogram.entity.ProductSku;

import java.util.List;

public interface ProductSkuService extends BaseService<ProductSku> {
    List<ProductSkuVO> listSkusByProductId(Long productId);
    ProductSkuVO createSku(ProductSkuDTO dto);
    ProductSkuVO updateSku(Long id, ProductSkuDTO dto);
    void deleteSku(Long id);
    boolean deductStock(Long skuId, Integer quantity);
    void restoreStock(Long skuId, Integer quantity);
}
