package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.*;
import com.miniprogram.entity.Product;
import com.miniprogram.entity.ProductCategory;
import com.miniprogram.entity.ProductSku;
import com.miniprogram.mapper.ProductCategoryMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.mapper.ProductSkuMapper;
import com.miniprogram.service.ProductService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 商品 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProductServiceImpl extends BaseServiceImpl<ProductMapper, Product>
        implements ProductService {

    private final ProductSkuMapper productSkuMapper;
    private final ProductCategoryMapper productCategoryMapper;
    private final ObjectMapper objectMapper;

    @Override
    public PageResult<Product> listProducts(ProductQueryDTO query) {
        Page<Product> page = new Page<>(query.getCurrent(), query.getSize());
        LambdaQueryWrapper<Product> wrapper = buildQueryWrapper(query);
        this.page(page, wrapper);
        return new PageResult<>(page.getRecords(), page.getTotal());
    }

    @Override
    public PageResult<Product> listMpProducts(ProductQueryDTO query) {
        Page<Product> page = new Page<>(query.getCurrent(), query.getSize());
        LambdaQueryWrapper<Product> wrapper = buildQueryWrapper(query)
                .eq(Product::getStatus, "on_sale");
        this.page(page, wrapper);
        return new PageResult<>(page.getRecords(), page.getTotal());
    }

    @Override
    public ProductDetailVO getProductDetail(Long id) {
        Product product = getExistingProduct(id);
        return convertToDetailVO(product);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ProductDetailVO createProduct(ProductDTO dto) {
        validateCategory(dto.getCategoryId());

        Product product = new Product();
        BeanUtils.copyProperties(dto, product);
        product.setProductType(normalizeProductType(dto.getProductType()));
        product.setImages(toJsonString(dto.getImages()));
        product.setStatus("off_sale"); // 新建默认下架
        this.save(product);

        // 保存SKU
        if (dto.getSkus() != null && !dto.getSkus().isEmpty()) {
            saveSkus(product.getId(), dto.getSkus());
        }

        return convertToDetailVO(product);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ProductDetailVO updateProduct(Long id, ProductDTO dto) {
        Product product = getExistingProduct(id);

        if (dto.getName() != null) product.setName(dto.getName());
        if (dto.getCategoryId() != null) {
            validateCategory(dto.getCategoryId());
            product.setCategoryId(dto.getCategoryId());
        }
        if (dto.getProductType() != null) product.setProductType(normalizeProductType(dto.getProductType()));
        if (dto.getMainImage() != null) product.setMainImage(dto.getMainImage());
        if (dto.getImages() != null) product.setImages(toJsonString(dto.getImages()));
        if (dto.getDescription() != null) product.setDescription(dto.getDescription());
        if (dto.getDetail() != null) product.setDetail(dto.getDetail());
        if (dto.getPrice() != null) product.setPrice(dto.getPrice());
        if (dto.getOriginalPrice() != null) product.setOriginalPrice(dto.getOriginalPrice());
        if (dto.getStock() != null) product.setStock(dto.getStock());
        if (dto.getUnit() != null) product.setUnit(dto.getUnit());
        if (dto.getSortOrder() != null) product.setSortOrder(dto.getSortOrder());

        this.updateById(product);

        // 更新SKU：先删除旧的再新增
        if (dto.getSkus() != null) {
            productSkuMapper.delete(new LambdaQueryWrapper<ProductSku>()
                    .eq(ProductSku::getProductId, id));
            saveSkus(id, dto.getSkus());
        }

        return convertToDetailVO(product);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteProduct(Long id) {
        getExistingProduct(id);
        // 删除关联SKU
        productSkuMapper.delete(new LambdaQueryWrapper<ProductSku>()
                .eq(ProductSku::getProductId, id));
        this.removeById(id);
    }

    @Override
    public void onSale(Long id) {
        Product product = getExistingProduct(id);
        if ("on_sale".equals(product.getStatus())) {
            throw new BusinessException(500201, "商品已上架");
        }
        validateOnSaleReady(product);
        product.setStatus("on_sale");
        this.updateById(product);
    }

    @Override
    public void offSale(Long id) {
        Product product = getExistingProduct(id);
        if ("off_sale".equals(product.getStatus())) {
            throw new BusinessException(500201, "商品已下架");
        }
        product.setStatus("off_sale");
        this.updateById(product);
    }

    // ==================== 私有方法 ====================

    private LambdaQueryWrapper<Product> buildQueryWrapper(ProductQueryDTO query) {
        LambdaQueryWrapper<Product> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(query.getKeyword())) {
            wrapper.like(Product::getName, query.getKeyword());
        }
        if (query.getCategoryId() != null) {
            wrapper.eq(Product::getCategoryId, query.getCategoryId());
        }
        if (StringUtils.hasText(query.getProductType())) {
            wrapper.eq(Product::getProductType, normalizeProductType(query.getProductType()));
        }
        if (StringUtils.hasText(query.getStatus())) {
            wrapper.eq(Product::getStatus, query.getStatus());
        }
        wrapper.orderByAsc(Product::getSortOrder)
               .orderByDesc(Product::getId);
        return wrapper;
    }

    private Product getExistingProduct(Long id) {
        Product product = this.getById(id);
        if (product == null) {
            throw new BusinessException(500401, "商品不存在");
        }
        return product;
    }

    private void validateCategory(Long categoryId) {
        ProductCategory category = productCategoryMapper.selectById(categoryId);
        if (category == null) {
            throw new BusinessException(500402, "商品分类不存在");
        }
    }

    private String normalizeProductType(String productType) {
        if (!StringUtils.hasText(productType)) {
            return "physical";
        }
        String value = productType.trim().toLowerCase();
        if ("digital".equals(value) || "service".equals(value)) {
            return value;
        }
        return "physical";
    }

    private void saveSkus(Long productId, List<ProductSkuDTO> skuDTOs) {
        for (ProductSkuDTO skuDTO : skuDTOs) {
            ProductSku sku = new ProductSku();
            sku.setProductId(productId);
            sku.setSkuName(skuDTO.getSkuName());
            sku.setSkuImage(skuDTO.getSkuImage());
            sku.setPrice(skuDTO.getPrice());
            sku.setOriginalPrice(skuDTO.getOriginalPrice());
            sku.setStock(skuDTO.getStock());
            sku.setSpecs(toJsonString(skuDTO.getSpecs()));
            sku.setSortOrder(skuDTO.getSortOrder());
            sku.setStatus(skuDTO.getStatus());
            productSkuMapper.insert(sku);
        }
    }

    private void validateOnSaleReady(Product product) {
        List<String> missing = new ArrayList<>();
        if (!StringUtils.hasText(product.getName())) {
            missing.add("商品名称");
        }
        if (product.getCategoryId() == null) {
            missing.add("商品分类");
        }
        if (!StringUtils.hasText(product.getMainImage())) {
            missing.add("商品主图");
        }
        if (product.getPrice() == null || product.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
            missing.add("有效售价");
        }

        List<ProductSku> skus = productSkuMapper.selectList(
                new LambdaQueryWrapper<ProductSku>()
                        .eq(ProductSku::getProductId, product.getId())
                        .eq(ProductSku::getStatus, 1));
        if (skus.isEmpty()) {
            missing.add("可用SKU");
        } else {
            boolean hasValidPrice = skus.stream()
                    .anyMatch(sku -> sku.getPrice() != null && sku.getPrice().compareTo(BigDecimal.ZERO) > 0);
            boolean hasStock = skus.stream()
                    .anyMatch(sku -> sku.getStock() != null && sku.getStock() > 0);
            if (!hasValidPrice) {
                missing.add("SKU价格");
            }
            if (!"digital".equals(product.getProductType()) && !hasStock) {
                missing.add("可售库存");
            }
        }

        if (!missing.isEmpty()) {
            throw new BusinessException(500202, "商品资料不完整，无法上架：" + String.join("、", missing));
        }
    }

    private ProductDetailVO convertToDetailVO(Product product) {
        ProductDetailVO vo = new ProductDetailVO();
        BeanUtils.copyProperties(product, vo);
        vo.setImages(parseJsonList(product.getImages()));

        // 分类名称
        if (product.getCategoryId() != null) {
            ProductCategory category = productCategoryMapper.selectById(product.getCategoryId());
            if (category != null) {
                vo.setCategoryName(category.getName());
            }
        }

        // SKU列表
        List<ProductSku> skus = productSkuMapper.selectList(
                new LambdaQueryWrapper<ProductSku>()
                        .eq(ProductSku::getProductId, product.getId())
                        .orderByAsc(ProductSku::getSortOrder));
        List<ProductSkuVO> skuVOs = skus.stream().map(sku -> {
            ProductSkuVO skuVO = new ProductSkuVO();
            BeanUtils.copyProperties(sku, skuVO);
            skuVO.setSpecs(parseJsonMap(sku.getSpecs()));
            return skuVO;
        }).toList();
        vo.setSkus(skuVOs);

        return vo;
    }

    private String toJsonString(Object obj) {
        if (obj == null) return null;
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            log.warn("JSON序列化失败", e);
            return null;
        }
    }

    private List<String> parseJsonList(String json) {
        if (json == null || json.isEmpty()) return new ArrayList<>();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            log.warn("JSON解析失败: {}", json, e);
            return new ArrayList<>();
        }
    }

    private Map<String, String> parseJsonMap(String json) {
        if (json == null || json.isEmpty()) return null;
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, String>>() {});
        } catch (JsonProcessingException e) {
            log.warn("JSON解析失败: {}", json, e);
            return null;
        }
    }
}
