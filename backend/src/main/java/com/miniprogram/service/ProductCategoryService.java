package com.miniprogram.service;

import com.miniprogram.dto.ProductCategoryDTO;
import com.miniprogram.dto.ProductCategoryTreeVO;
import com.miniprogram.entity.ProductCategory;

import java.util.List;
import com.baomidou.mybatisplus.extension.service.IService;

/**
 * 商品分类 Service
 */
public interface ProductCategoryService extends IService<ProductCategory> {

    /**
     * 获取分类树
     */
    List<ProductCategoryTreeVO> getCategoryTree();

    /**
     * 创建分类
     */
    ProductCategoryTreeVO createCategory(ProductCategoryDTO dto);

    /**
     * 更新分类
     */
    ProductCategoryTreeVO updateCategory(Long id, ProductCategoryDTO dto);

    /**
     * 删除分类
     */
    void deleteCategory(Long id);
}
