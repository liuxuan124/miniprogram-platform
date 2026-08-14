package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.dto.ProductCategoryDTO;
import com.miniprogram.dto.ProductCategoryTreeVO;
import com.miniprogram.entity.Product;
import com.miniprogram.entity.ProductCategory;
import com.miniprogram.mapper.ProductCategoryMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.product.ProductTypes;
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

    private final ProductMapper productMapper;
    private final ObjectMapper objectMapper;

    @Override
    public List<ProductCategoryTreeVO> getCategoryTree() {
        List<ProductCategory> allCategories = this.list(new LambdaQueryWrapper<ProductCategory>()
                .orderByAsc(ProductCategory::getSortOrder)
                .orderByAsc(ProductCategory::getId));

        List<ProductCategoryTreeVO> voList = allCategories.stream().map(this::toVO).toList();

        Map<Long, List<ProductCategoryTreeVO>> childrenMap = voList.stream()
                .filter(vo -> vo.getParentId() != null && vo.getParentId() != 0)
                .collect(Collectors.groupingBy(ProductCategoryTreeVO::getParentId));

        voList.forEach(vo -> vo.setChildren(childrenMap.getOrDefault(vo.getId(), new ArrayList<>())));

        return voList.stream()
                .filter(vo -> vo.getParentId() == null || vo.getParentId() == 0)
                .collect(Collectors.toList());
    }

    @Override
    public ProductCategoryTreeVO createCategory(ProductCategoryDTO dto) {
        if (dto.getParentId() != null && dto.getParentId() != 0) {
            ProductCategory parent = this.getById(dto.getParentId());
            if (parent == null) {
                throw new BusinessException(500402, "商品分类不存在");
            }
        }

        ProductCategory category = new ProductCategory();
        category.setName(dto.getName());
        category.setParentId(dto.getParentId() == null ? 0L : dto.getParentId());
        category.setSortOrder(dto.getSortOrder() == null ? 0 : dto.getSortOrder());
        category.setIcon(dto.getIcon());
        category.setStatus(dto.getStatus() == null ? 1 : dto.getStatus());
        category.setAllowedProductTypes(toJson(resolveAllowedTypes(dto.getAllowedProductTypes(), dto.getName())));
        this.save(category);

        return toVO(category);
    }

    @Override
    public ProductCategoryTreeVO updateCategory(Long id, ProductCategoryDTO dto) {
        ProductCategory category = getExistingCategory(id);

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
        if (dto.getAllowedProductTypes() != null) {
            category.setAllowedProductTypes(toJson(ProductTypes.normalizeList(dto.getAllowedProductTypes())));
        }

        this.updateById(category);
        return toVO(category);
    }

    @Override
    public void deleteCategory(Long id) {
        getExistingCategory(id);

        long childCount = this.count(new LambdaQueryWrapper<ProductCategory>()
                .eq(ProductCategory::getParentId, id));
        if (childCount > 0) {
            throw new BusinessException(500203, "分类下有子分类不可删除");
        }

        long productCount = productMapper.selectCount(new LambdaQueryWrapper<Product>()
                .eq(Product::getCategoryId, id));
        if (productCount > 0) {
            throw new BusinessException(500204, "分类下还有商品不可删除");
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

    private ProductCategoryTreeVO toVO(ProductCategory category) {
        ProductCategoryTreeVO vo = new ProductCategoryTreeVO();
        BeanUtils.copyProperties(category, vo);
        vo.setAllowedProductTypes(parseTypes(category.getAllowedProductTypes()));
        vo.setChildren(new ArrayList<>());
        return vo;
    }

    private List<String> resolveAllowedTypes(List<String> raw, String name) {
        if (raw != null && !raw.isEmpty()) {
            return ProductTypes.normalizeList(raw);
        }
        return suggestByName(name);
    }

    private List<String> suggestByName(String name) {
        if (name == null) return new ArrayList<>(ProductTypes.ALL);
        String n = name.toLowerCase();
        if (n.contains("资料") || n.contains("知识") || n.contains("课程") || n.contains("数字")) {
            return List.of(ProductTypes.DIGITAL);
        }
        if (n.contains("咨询") || n.contains("服务") || n.contains("预约") || n.contains("1v1")) {
            return List.of(ProductTypes.SERVICE);
        }
        if (n.contains("礼盒") || n.contains("文创") || n.contains("周边")) {
            return List.of(ProductTypes.PHYSICAL, ProductTypes.DIGITAL);
        }
        return new ArrayList<>(ProductTypes.ALL);
    }

    private List<String> parseTypes(String json) {
        if (json == null || json.isBlank()) {
            return new ArrayList<>(ProductTypes.ALL);
        }
        try {
            List<String> list = objectMapper.readValue(json, new TypeReference<List<String>>() {});
            return ProductTypes.normalizeList(list);
        } catch (Exception e) {
            return ProductTypes.normalizeList(List.of(json));
        }
    }

    private String toJson(List<String> types) {
        try {
            return objectMapper.writeValueAsString(ProductTypes.normalizeList(types));
        } catch (JsonProcessingException e) {
            return "[\"physical\"]";
        }
    }
}
