package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.ProductQueryDTO;
import com.miniprogram.entity.Product;
import com.miniprogram.service.ProductCategoryService;
import com.miniprogram.service.ProductService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 商品管理接口契约测试。
 */
class ProductControllerIntegrationTest {

    private MockMvc productMvc;
    private MockMvc categoryMvc;
    private ProductService productService;
    private ProductCategoryService productCategoryService;

    @BeforeEach
    void setUp() {
        productService = mock(ProductService.class);
        productCategoryService = mock(ProductCategoryService.class);
        productMvc = MockMvcBuilders.standaloneSetup(new AdminProductController(productService)).build();
        categoryMvc = MockMvcBuilders.standaloneSetup(new ProductCategoryController(productCategoryService)).build();
    }

    @Test
    @DisplayName("商品列表接口 - 返回分页数据")
    void should_returnPageData_when_listProducts() throws Exception {
        PageResult<Product> pageResult = new PageResult<>(Collections.emptyList(), 0L, 1L, 10L);
        when(productService.listProducts(any(ProductQueryDTO.class))).thenReturn(pageResult);

        productMvc.perform(get("/api/v1/admin/products")
                        .param("current", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.total").value(0));
    }

    @Test
    @DisplayName("商品分类树接口 - 返回分类数据")
    void should_returnCategories_when_listProductCategories() throws Exception {
        when(productCategoryService.getCategoryTree()).thenReturn(Collections.emptyList());

        categoryMvc.perform(get("/api/v1/admin/product-categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }
}
