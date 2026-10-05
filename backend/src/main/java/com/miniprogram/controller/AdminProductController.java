package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.ProductDTO;
import com.miniprogram.dto.ProductDetailVO;
import com.miniprogram.annotation.OperationLog;
import com.miniprogram.dto.ProductQueryDTO;
import com.miniprogram.dto.system.UploadResultVO;
import com.miniprogram.service.ProductService;
import com.miniprogram.service.RemoteMediaTransferService;
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
    private final RemoteMediaTransferService remoteMediaTransferService;

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

    /**
     * 商品媒体外链转存：运营在图片池里粘的第三方 URL，由服务端下载后落自有存储。
     *
     * 🔴 刻意挂在 {@code /api/v1/admin/products/**} 而不是 {@code /admin/system/**}：
     * 后者在 SecurityConfig 里是 super_admin 专属前缀，而商品编辑是 content_ops 的日常操作，
     * 挂过去运营粘外链会直接 403。
     */
    @PostMapping("/media/transfer")
    @PreAuthorize("hasAuthority('product:update') or hasAuthority('product:create')")
    @Operation(summary = "商品媒体外链转存（下载远程图片/视频到自有存储）")
    @OperationLog("转存商品外链媒体")
    public R<UploadResultVO> transferMedia(@RequestParam("url") String url) {
        return R.ok(remoteMediaTransferService.transfer(url, "product-media"));
    }
}
