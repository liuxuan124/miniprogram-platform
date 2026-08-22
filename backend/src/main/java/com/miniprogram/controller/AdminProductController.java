package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.ProductDTO;
import com.miniprogram.dto.ProductDetailVO;
import com.miniprogram.dto.ProductQueryDTO;
import com.miniprogram.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * 后台-商品管理
 */
@RestController
@RequestMapping("/api/v1/admin/products")
@RequiredArgsConstructor
@Tag(name = "后台-商品管理")
public class AdminProductController {

    private final ProductService productService;

    @GetMapping
    @PreAuthorize("hasAuthority('product:list')")
    @Operation(summary = "商品列表")
    public R<PageResult<ProductDetailVO>> listProducts(ProductQueryDTO query) {
        return R.ok(productService.listProducts(query));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('product:list')")
    @Operation(summary = "商品详情")
    public R<ProductDetailVO> getProductDetail(@PathVariable Long id) {
        return R.ok(productService.getProductDetail(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('product:create')")
    @Operation(summary = "创建商品")
    public R<ProductDetailVO> createProduct(@Valid @RequestBody ProductDTO dto) {
        return R.ok(productService.createProduct(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('product:update')")
    @Operation(summary = "更新商品")
    public R<ProductDetailVO> updateProduct(@PathVariable Long id,
                                             @Valid @RequestBody ProductDTO dto) {
        return R.ok(productService.updateProduct(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('product:delete')")
    @Operation(summary = "删除商品")
    public R<Void> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return R.ok(null);
    }

    @PutMapping("/{id}/on-sale")
    @PreAuthorize("hasAuthority('product:publish')")
    @Operation(summary = "上架商品")
    public R<Void> onSale(@PathVariable Long id) {
        productService.onSale(id);
        return R.ok(null);
    }

    @PutMapping("/{id}/off-sale")
    @PreAuthorize("hasAuthority('product:publish')")
    @Operation(summary = "下架商品")
    public R<Void> offSale(@PathVariable Long id) {
        productService.offSale(id);
        return R.ok(null);
    }
}
