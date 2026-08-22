package com.miniprogram.mapper;

import com.miniprogram.entity.ProductSku;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

/**
 * 商品SKU Mapper
 */
public interface ProductSkuMapper extends BaseMapper<ProductSku> {

    @Update("UPDATE mp_product_sku SET stock = stock - #{qty} WHERE id = #{id} AND stock >= #{qty}")
    int deductStock(@Param("id") Long id, @Param("qty") int qty);

    @Update("UPDATE mp_product_sku SET stock = stock + #{qty} WHERE id = #{id}")
    int restoreStock(@Param("id") Long id, @Param("qty") int qty);
}
