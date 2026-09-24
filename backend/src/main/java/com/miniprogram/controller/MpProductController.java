package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.ProductDetailVO;
import com.miniprogram.dto.ProductQueryDTO;
import com.miniprogram.compliance.IosVirtualPayPolicyService;
import com.miniprogram.entity.Product;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.ProductService;
import com.miniprogram.service.PurchaseEntitlementService;
import com.miniprogram.support.FeatureModuleGuard;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 小程序端-商品接口
 */
@RestController
@RequestMapping("/api/v1/mp/products")
@RequiredArgsConstructor
@Tag(name = "小程序端-商品接口")
public class MpProductController {

    private final ProductService productService;
    private final ProductMapper productMapper;
    private final FeatureModuleGuard featureModuleGuard;
    private final PurchaseEntitlementService purchaseEntitlementService;
    private final IosVirtualPayPolicyService iosVirtualPayPolicyService;

    @GetMapping
    @Operation(summary = "商品列表（公开）")
    public R<PageResult<Product>> listProducts(ProductQueryDTO query) {
        featureModuleGuard.requireProductModule();
        return R.ok(productService.listMpProducts(query));
    }

    @GetMapping("/smoke/pay1")
    @Operation(summary = "暖阁 ¥1 支付验通路商品（不存在则自动补种）")
    public R<Product> getPay1SmokeProduct() {
        featureModuleGuard.requireProductModule();
        return R.ok(productService.ensurePay1SmokeProduct());
    }

    @GetMapping("/{id}")
    @Operation(summary = "商品详情（公开）")
    public R<ProductDetailVO> getProductDetail(
            @PathVariable Long id,
            @RequestHeader(value = "X-Client-Platform", required = false) String clientPlatform) {
        featureModuleGuard.requireProductModule();
        ProductDetailVO detail = productService.getProductDetail(id);
        if (!"on_sale".equals(detail.getStatus())) {
            throw new com.miniprogram.common.BusinessException(404401, "商品不存在或未上架");
        }
        Long userId = SecurityUtils.getCurrentUserId();
        detail.setPurchased(userId != null && purchaseEntitlementService.hasProduct(userId, id));
        Product product = productMapper.selectById(id);
        if (product != null) {
            IosVirtualPayPolicyService.PurchaseGate gate =
                    iosVirtualPayPolicyService.evaluateProduct(clientPlatform, product);
            detail.setCanPurchase(gate.canPurchase());
            detail.setPurchaseBlockReason(gate.blockReason());
        }
        return R.ok(detail);
    }
}
