package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.dto.ProductCategoryDTO;
import com.miniprogram.dto.ProductCategoryTreeVO;
import com.miniprogram.entity.ProductCategory;
import com.miniprogram.mapper.ProductCategoryMapper;
import com.miniprogram.service.ProductCategoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 商品分类 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProductCategoryServiceImpl extends BaseServiceImpl<ProductCategoryMapper, ProductCategory>
        implements ProductCategoryService {

    @Override
    public List<ProductCategoryTreeVO> getCategoryTree() {
        List<ProductCategory> allCategories = this.list(new LambdaQueryWrapper<ProductCategory>()
                .orderByAsc(ProductCategory::getSortOrder)
                .orderByAsc(ProductCategory::getId));

        List<ProductCategoryTreeVO> voList = allCategories.stream().map(cat -> {
            ProductCategoryTreeVO vo = new ProductCategoryTreeVO();
            BeanUtils.copyProperties(cat, vo);
            return vo;
        }).toList();

        // 构建树形结构
        Map<Long, List<ProductCategoryTreeVO>> childrenMap = voList.stream()
                .filter(vo -> vo.getParentId() != null && vo.getParentId() != 0)
                .collect(Collectors.groupingBy(ProductCategoryTreeVO::getParentId));

        voList.forEach(vo -> vo.setChildren(childrenMap.getOrDefault(vo.getId(), new ArrayList<>())));

        // 返回顶级节点
        return voList.stream()
                .filter(vo -> vo.getParentId() == null || vo.getParentId() == 0)
                .collect(Collectors.toList());
    }

    @Override
    public ProductCategoryTreeVO createCategory(ProductCategoryDTO dto) {
        // 校验父分类存在
        if (dto.getParentId() != null && dto.getParentId() != 0) {
            ProductCategory parent = this.getById(dto.getParentId());
            if (parent == null) {
                throw new BusinessException(500402, "商品分类不存在");
            }
        }

        ProductCategory category = new ProductCategory();
        BeanUtils.copyProperties(dto, category);
        this.save(category);

        ProductCategoryTreeVO vo = new ProductCategoryTreeVO();
        BeanUtils.copyProperties(category, vo);
        vo.setChildren(new ArrayList<>());
        return vo;
    }

    @Override
    public ProductCategoryTreeVO updateCategory(Long id, ProductCategoryDTO dto) {
        ProductCategory category = getExistingCategory(id);

        // 校验父分类存在
        if (dto.getParentId() != null && dto.getParentId() != 0) {
            if (dto.getParentId().equals(id)) {
                throw new BusinessException(500201, "不能将自己设为父分类");
            }
            ProductCategory parent = this.getById(dto.getParentId());
            if (parent == null) {
                throw new BusinessException(500402, "商品分类不存在");
            }
        }

        if (dto.getName() != null) category.setName(dto.getName());
        if (dto.getParentId() != null) category.setParentId(dto.getParentId());
        if (dto.getSortOrder() != null) category.setSortOrder(dto.getSortOrder());
        if (dto.getIcon() != null) category.setIcon(dto.getIcon());
        if (dto.getStatus() != null) category.setStatus(dto.getStatus());

        this.updateById(category);

        ProductCategoryTreeVO vo = new ProductCategoryTreeVO();
        BeanUtils.copyProperties(category, vo);
        vo.setChildren(new ArrayList<>());
        return vo;
    }

    @Override
    public void deleteCategory(Long id) {
        ProductCategory category = getExistingCategory(id);

        // 检查是否有子分类
        long childCount = this.count(new LambdaQueryWrapper<ProductCategory>()
                .eq(ProductCategory::getParentId, id));
        if (childCount > 0) {
            throw new BusinessException(500203, "分类下有子分类不可删除");
        }

        this.removeById(id);
    }

    private ProductCategory getExistingCategory(Long id) {
        ProductCategory category = this.getById(id);
        if (category == null) {
            throw new BusinessException(500402, "商品分类不存在");
        }
        return category;
    }
}
