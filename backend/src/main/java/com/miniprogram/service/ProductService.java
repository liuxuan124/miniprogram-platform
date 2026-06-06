package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.ProductDTO;
import com.miniprogram.dto.ProductDetailVO;
import com.miniprogram.dto.ProductQueryDTO;
import com.miniprogram.entity.Product;
import com.baomidou.mybatisplus.extension.service.IService;

/**
 * 商品 Service
 */
public interface ProductService extends IService<Product> {

    /**
     * 分页查询商品（后台）
     */
    PageResult<Product> listProducts(ProductQueryDTO query);

    /**
     * 分页查询商品（小程序端，仅上架）
     */
    PageResult<Product> listMpProducts(ProductQueryDTO query);

    /**
     * 获取商品详情
     */
    ProductDetailVO getProductDetail(Long id);

    /**
     * 创建商品
     */
    ProductDetailVO createProduct(ProductDTO dto);

    /**
     * 更新商品
     */
    ProductDetailVO updateProduct(Long id, ProductDTO dto);

    /**
     * 删除商品
     */
    void deleteProduct(Long id);

    /**
     * 上架
     */
    void onSale(Long id);

    /**
     * 下架
     */
    void offSale(Long id);
}
