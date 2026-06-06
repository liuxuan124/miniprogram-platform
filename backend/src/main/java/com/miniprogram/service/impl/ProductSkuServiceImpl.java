package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.dto.ProductSkuDTO;
import com.miniprogram.dto.ProductSkuVO;
import com.miniprogram.entity.ProductSku;
import com.miniprogram.mapper.ProductSkuMapper;
import com.miniprogram.service.ProductSkuService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductSkuServiceImpl extends BaseServiceImpl<ProductSkuMapper, ProductSku>
        implements ProductSkuService {

    private final ObjectMapper objectMapper;

    @Override
    public List<ProductSkuVO> listSkusByProductId(Long productId) {
        List<ProductSku> skus = this.list(new LambdaQueryWrapper<ProductSku>()
                .eq(ProductSku::getProductId, productId)
                .orderByAsc(ProductSku::getSortOrder));
        return skus.stream().map(this::toVO).toList();
    }

    @Override
    public ProductSkuVO createSku(ProductSkuDTO dto) {
        ProductSku sku = new ProductSku();
        BeanUtils.copyProperties(dto, sku);
        sku.setSpecs(toJsonString(dto.getSpecs()));
        this.save(sku);
        return toVO(sku);
    }

    @Override
    public ProductSkuVO updateSku(Long id, ProductSkuDTO dto) {
        ProductSku sku = this.getById(id);
        if (sku == null) {
            throw new BusinessException(500401, "SKU不存在");
        }
        if (dto.getSkuName() != null) sku.setSkuName(dto.getSkuName());
        if (dto.getSkuImage() != null) sku.setSkuImage(dto.getSkuImage());
        if (dto.getPrice() != null) sku.setPrice(dto.getPrice());
        if (dto.getOriginalPrice() != null) sku.setOriginalPrice(dto.getOriginalPrice());
        if (dto.getStock() != null) sku.setStock(dto.getStock());
        if (dto.getSpecs() != null) sku.setSpecs(toJsonString(dto.getSpecs()));
        if (dto.getSortOrder() != null) sku.setSortOrder(dto.getSortOrder());
        if (dto.getStatus() != null) sku.setStatus(dto.getStatus());
        this.updateById(sku);
        return toVO(sku);
    }

    @Override
    public void deleteSku(Long id) {
        this.removeById(id);
    }

    @Override
    public boolean deductStock(Long skuId, Integer quantity) {
        return this.update(new LambdaUpdateWrapper<ProductSku>()
                .eq(ProductSku::getId, skuId)
                .ge(ProductSku::getStock, quantity)
                .setSql("stock = stock - " + quantity));
    }

    @Override
    public void restoreStock(Long skuId, Integer quantity) {
        this.update(new LambdaUpdateWrapper<ProductSku>()
                .eq(ProductSku::getId, skuId)
                .setSql("stock = stock + " + quantity));
    }

    private ProductSkuVO toVO(ProductSku sku) {
        ProductSkuVO vo = new ProductSkuVO();
        BeanUtils.copyProperties(sku, vo);
        vo.setSpecs(parseJsonMap(sku.getSpecs()));
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
