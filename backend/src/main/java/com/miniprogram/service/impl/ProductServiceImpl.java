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
import com.miniprogram.product.ProductTypes;
import com.miniprogram.service.ProductService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 商品 Service 实现
 * 状态对齐内容/优惠券：draft（草稿）→ on_sale（上架）↔ off_sale（下架）
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProductServiceImpl extends BaseServiceImpl<ProductMapper, Product>
        implements ProductService {

    private static final DateTimeFormatter DT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final ProductSkuMapper productSkuMapper;
    private final ProductCategoryMapper productCategoryMapper;
    private final ObjectMapper objectMapper;

    @Override
    public PageResult<ProductDetailVO> listProducts(ProductQueryDTO query) {
        Page<Product> page = new Page<>(query.getCurrent(), query.getSize());
        LambdaQueryWrapper<Product> wrapper = buildQueryWrapper(query);
        this.page(page, wrapper);
        List<ProductDetailVO> records = toListVOs(page.getRecords());
        return new PageResult<>(records, page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    public PageResult<Product> listMpProducts(ProductQueryDTO query) {
        Page<Product> page = new Page<>(query.getCurrent(), query.getSize());
        LambdaQueryWrapper<Product> wrapper = buildQueryWrapper(query)
                .eq(Product::getStatus, "on_sale");
        this.page(page, wrapper);
        return new PageResult<>(page.getRecords(), page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    public ProductStatsVO getStats() {
        ProductStatsVO vo = new ProductStatsVO();
        vo.setTotal(this.count());
        vo.setOnSale(this.count(new LambdaQueryWrapper<Product>().eq(Product::getStatus, "on_sale")));
        vo.setDraft(this.count(new LambdaQueryWrapper<Product>().eq(Product::getStatus, "draft")));
        vo.setOffSale(this.count(new LambdaQueryWrapper<Product>().eq(Product::getStatus, "off_sale")));
        vo.setLowStock(this.count(new LambdaQueryWrapper<Product>()
                .ne(Product::getProductType, "digital")
                .lt(Product::getStock, 10)));
        return vo;
    }

    @Override
    public ProductDetailVO getProductDetail(Long id) {
        Product product = getExistingProduct(id);
        return convertToDetailVO(product, true);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ProductDetailVO createProduct(ProductDTO dto) {
        validateCategory(dto.getCategoryId());

        Product product = new Product();
        BeanUtils.copyProperties(dto, product);
        applyProductTypes(product, dto, dto.getCategoryId());
        product.setImages(toJsonString(dto.getImages()));
        // 与内容/优惠券一致：新建默认草稿，需显式上架
        product.setStatus("draft");
        if (product.getSales() == null) {
            product.setSales(0);
        }
        this.save(product);

        if (dto.getSkus() != null && !dto.getSkus().isEmpty()) {
            upsertSkus(product.getId(), dto.getSkus());
            syncProductAggregatesFromSkus(product.getId());
        }

        return convertToDetailVO(getExistingProduct(product.getId()), true);
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
        if (dto.getProductTypes() != null || dto.getProductType() != null) {
            applyProductTypes(product, dto, product.getCategoryId());
        }
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

        if (dto.getSkus() != null) {
            upsertSkus(id, dto.getSkus());
            syncProductAggregatesFromSkus(id);
        }

        return convertToDetailVO(getExistingProduct(id), true);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteProduct(Long id) {
        getExistingProduct(id);
        productSkuMapper.delete(new LambdaQueryWrapper<ProductSku>()
                .eq(ProductSku::getProductId, id));
        this.removeById(id);
    }

    @Override
    public void onSale(Long id) {
        Product product = getExistingProduct(id);
        if ("on_sale".equals(product.getStatus())) {
            return; // 幂等
        }
        syncProductAggregatesFromSkus(id);
        product = getExistingProduct(id);
        validateOnSaleReady(product);
        product.setStatus("on_sale");
        this.updateById(product);
    }

    @Override
    public void offSale(Long id) {
        Product product = getExistingProduct(id);
        if ("off_sale".equals(product.getStatus())) {
            return; // 幂等
        }
        if ("draft".equals(product.getStatus())) {
            // 草稿未上架过，保持草稿即可
            return;
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
            String type = ProductTypes.normalizeOne(query.getProductType());
            wrapper.and(w -> w.eq(Product::getProductType, type)
                    .or()
                    .like(Product::getProductTypes, "\"" + type + "\""));
        }
        if (StringUtils.hasText(query.getStatus())) {
            wrapper.eq(Product::getStatus, normalizeStatus(query.getStatus()));
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
        if (category.getStatus() != null && category.getStatus() == 0) {
            throw new BusinessException(500403, "商品分类已禁用");
        }
    }

    private void applyProductTypes(Product product, ProductDTO dto, Long categoryId) {
        List<String> requested = dto.getProductTypes();
        if (requested == null || requested.isEmpty()) {
            if (StringUtils.hasText(dto.getProductType())) {
                requested = List.of(dto.getProductType());
            } else if (StringUtils.hasText(product.getProductTypes())) {
                requested = parseTypeList(product.getProductTypes());
            } else if (StringUtils.hasText(product.getProductType())) {
                requested = List.of(product.getProductType());
            } else {
                requested = List.of(ProductTypes.PHYSICAL);
            }
        }
        List<String> types = ProductTypes.normalizeList(requested);
        if (categoryId != null) {
            ProductCategory category = productCategoryMapper.selectById(categoryId);
            if (category != null) {
                List<String> allowed = parseTypeList(category.getAllowedProductTypes());
                if (allowed.isEmpty()) {
                    allowed = new ArrayList<>(ProductTypes.ALL);
                }
                List<String> finalAllowed = allowed;
                types = types.stream().filter(finalAllowed::contains).collect(Collectors.toList());
                if (types.isEmpty()) {
                    throw new BusinessException(500205, "商品类型不在所选分类允许范围内：" + String.join("/", allowed));
                }
            }
        }
        product.setProductTypes(toJsonString(types));
        product.setProductType(ProductTypes.primaryOf(types));
    }

    private List<String> parseTypeList(String json) {
        if (!StringUtils.hasText(json)) {
            return new ArrayList<>();
        }
        try {
            List<String> list = objectMapper.readValue(json, new TypeReference<List<String>>() {});
            return ProductTypes.normalizeList(list);
        } catch (Exception e) {
            return ProductTypes.normalizeList(List.of(json));
        }
    }

    private String normalizeProductType(String productType) {
        return ProductTypes.normalizeOne(productType);
    }

    private String normalizeStatus(String status) {
        if (!StringUtils.hasText(status)) {
            return status;
        }
        String v = status.trim().toLowerCase();
        if ("draft".equals(v) || "on_sale".equals(v) || "off_sale".equals(v)) {
            return v;
        }
        return v;
    }

    /**
     * 按 id upsert：保留已有 skuId，删除本次未提交的 SKU。
     */
    private void upsertSkus(Long productId, List<ProductSkuDTO> skuDTOs) {
        List<ProductSku> existing = productSkuMapper.selectList(new LambdaQueryWrapper<ProductSku>()
                .eq(ProductSku::getProductId, productId));
        Map<Long, ProductSku> existingMap = existing.stream()
                .filter(s -> s.getId() != null)
                .collect(Collectors.toMap(ProductSku::getId, s -> s, (a, b) -> a));

        Set<Long> keepIds = new HashSet<>();
        int index = 0;
        for (ProductSkuDTO skuDTO : skuDTOs) {
            ProductSku sku;
            if (skuDTO.getId() != null && existingMap.containsKey(skuDTO.getId())) {
                sku = existingMap.get(skuDTO.getId());
                keepIds.add(sku.getId());
            } else {
                sku = new ProductSku();
                sku.setProductId(productId);
            }
            sku.setSkuName(skuDTO.getSkuName());
            sku.setSkuImage(skuDTO.getSkuImage());
            sku.setPrice(skuDTO.getPrice() != null ? skuDTO.getPrice() : BigDecimal.ZERO);
            sku.setOriginalPrice(skuDTO.getOriginalPrice());
            sku.setStock(skuDTO.getStock());
            sku.setSpecs(toJsonString(skuDTO.getSpecs()));
            sku.setSortOrder(skuDTO.getSortOrder() != null ? skuDTO.getSortOrder() : index);
            sku.setStatus(skuDTO.getStatus() != null ? skuDTO.getStatus() : 1);
            if (sku.getId() == null) {
                productSkuMapper.insert(sku);
                if (sku.getId() != null) {
                    keepIds.add(sku.getId());
                }
            } else {
                productSkuMapper.updateById(sku);
            }
            index++;
        }

        for (ProductSku old : existing) {
            if (old.getId() != null && !keepIds.contains(old.getId())) {
                productSkuMapper.deleteById(old.getId());
            }
        }
    }

    /** 从 SKU 汇总商品售价/原价/库存，避免主表价格与 SKU 不一致 */
    private void syncProductAggregatesFromSkus(Long productId) {
        List<ProductSku> skus = productSkuMapper.selectList(
                new LambdaQueryWrapper<ProductSku>()
                        .eq(ProductSku::getProductId, productId)
                        .eq(ProductSku::getStatus, 1));
        if (skus.isEmpty()) {
            return;
        }
        Product product = getExistingProduct(productId);
        BigDecimal minPrice = skus.stream()
                .map(ProductSku::getPrice)
                .filter(Objects::nonNull)
                .min(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);
        BigDecimal maxOriginal = skus.stream()
                .map(s -> s.getOriginalPrice() != null ? s.getOriginalPrice() : s.getPrice())
                .filter(Objects::nonNull)
                .max(BigDecimal::compareTo)
                .orElse(minPrice);
        int totalStock = skus.stream()
                .map(ProductSku::getStock)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .sum();
        product.setPrice(minPrice);
        product.setOriginalPrice(maxOriginal);
        product.setStock(totalStock);
        this.updateById(product);
    }

    private boolean isValidSkuPrice(BigDecimal price) {
        return price != null && price.compareTo(BigDecimal.ZERO) >= 0;
    }

    private BigDecimal resolveEffectivePrice(Product product, List<ProductSku> skus) {
        if (isValidSkuPrice(product.getPrice())) {
            return product.getPrice();
        }
        return skus.stream()
                .map(ProductSku::getPrice)
                .filter(this::isValidSkuPrice)
                .min(BigDecimal::compareTo)
                .orElse(null);
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

        List<ProductSku> skus = productSkuMapper.selectList(
                new LambdaQueryWrapper<ProductSku>()
                        .eq(ProductSku::getProductId, product.getId())
                        .eq(ProductSku::getStatus, 1));
        BigDecimal effectivePrice = resolveEffectivePrice(product, skus);
        if (!isValidSkuPrice(effectivePrice)) {
            missing.add("有效售价");
        }

        if (skus.isEmpty()) {
            missing.add("可用SKU");
        } else {
            boolean hasValidPrice = skus.stream().anyMatch(sku -> isValidSkuPrice(sku.getPrice()));
            boolean hasStock = skus.stream()
                    .anyMatch(sku -> sku.getStock() != null && sku.getStock() > 0);
            if (!hasValidPrice) {
                missing.add("SKU价格");
            }
            if (!"digital".equals(product.getProductType())
                    && !ProductTypes.contains(parseTypeList(product.getProductTypes()), ProductTypes.DIGITAL)
                    && !hasStock) {
                missing.add("可售库存");
            }
        }

        if (!missing.isEmpty()) {
            throw new BusinessException(500202, "商品资料不完整，无法上架：" + String.join("、", missing));
        }
    }

    private List<ProductDetailVO> toListVOs(List<Product> products) {
        if (CollectionUtils.isEmpty(products)) {
            return List.of();
        }
        Set<Long> categoryIds = products.stream()
                .map(Product::getCategoryId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, String> categoryNames = new HashMap<>();
        if (!categoryIds.isEmpty()) {
            productCategoryMapper.selectList(new LambdaQueryWrapper<ProductCategory>()
                            .in(ProductCategory::getId, categoryIds))
                    .forEach(c -> categoryNames.put(c.getId(), c.getName()));
        }
        List<ProductDetailVO> result = new ArrayList<>(products.size());
        for (Product product : products) {
            ProductDetailVO vo = convertToDetailVO(product, false);
            if (product.getCategoryId() != null) {
                vo.setCategoryName(categoryNames.get(product.getCategoryId()));
            }
            result.add(vo);
        }
        return result;
    }

    private ProductDetailVO convertToDetailVO(Product product, boolean withSkus) {
        ProductDetailVO vo = new ProductDetailVO();
        BeanUtils.copyProperties(product, vo);
        vo.setImages(mergeMainAndGallery(product.getMainImage(), parseJsonList(product.getImages())));
        List<String> types = parseTypeList(product.getProductTypes());
        if (types.isEmpty() && StringUtils.hasText(product.getProductType())) {
            types = List.of(ProductTypes.normalizeOne(product.getProductType()));
        }
        vo.setProductTypes(types);
        vo.setProductType(ProductTypes.primaryOf(types));
        if (product.getCreatedAt() != null) {
            vo.setCreatedAt(product.getCreatedAt().format(DT));
        }
        if (product.getUpdatedAt() != null) {
            vo.setUpdatedAt(product.getUpdatedAt().format(DT));
        }

        if (product.getCategoryId() != null && vo.getCategoryName() == null) {
            ProductCategory category = productCategoryMapper.selectById(product.getCategoryId());
            if (category != null) {
                vo.setCategoryName(category.getName());
            }
        }

        if (withSkus) {
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
        } else {
            vo.setSkus(List.of());
        }

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

    private List<String> mergeMainAndGallery(String mainImage, List<String> gallery) {
        List<String> result = new ArrayList<>();
        if (StringUtils.hasText(mainImage)) {
            result.add(mainImage.trim());
        }
        if (gallery != null) {
            for (String img : gallery) {
                if (!StringUtils.hasText(img)) continue;
                String u = img.trim();
                if (!result.contains(u)) result.add(u);
            }
        }
        return result;
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
