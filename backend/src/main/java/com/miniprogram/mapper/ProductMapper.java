package com.miniprogram.mapper;

import com.miniprogram.entity.Product;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

/**
 * 商品 Mapper
 */
public interface ProductMapper extends BaseMapper<Product> {

    @Update("UPDATE mp_product SET stock = stock - #{qty}, sales = IFNULL(sales,0) + #{qty} " +
            "WHERE id = #{id} AND stock >= #{qty}")
    int deductStock(@Param("id") Long id, @Param("qty") int qty);

    @Update("UPDATE mp_product SET stock = stock + #{qty}, sales = GREATEST(IFNULL(sales,0) - #{qty}, 0) " +
            "WHERE id = #{id}")
    int restoreStock(@Param("id") Long id, @Param("qty") int qty);

    @Update("UPDATE mp_product SET sales = IFNULL(sales,0) + #{qty} WHERE id = #{id}")
    int increaseSales(@Param("id") Long id, @Param("qty") int qty);
}
