package com.miniprogram.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.R;
import com.miniprogram.entity.ProductCardCode;
import com.miniprogram.entity.ProductFileRel;
import com.miniprogram.mapper.ProductCardCodeMapper;
import com.miniprogram.mapper.ProductFileRelMapper;
import com.miniprogram.support.CardCodeCrypto;
import io.swagger.v3.oas.annotations.Operation;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/products/{productId}/delivery")
@RequiredArgsConstructor
public class AdminProductDeliveryController {

    private final ProductFileRelMapper productFileRelMapper;
    private final ProductCardCodeMapper productCardCodeMapper;
    private final CardCodeCrypto cardCodeCrypto;

    @GetMapping("/files")
    @PreAuthorize("hasAuthority('product:list')")
    @Operation(summary = "商品关联资料文件")
    public R<List<ProductFileRel>> listFiles(@PathVariable Long productId) {
        return R.ok(productFileRelMapper.selectList(new LambdaQueryWrapper<ProductFileRel>()
                .eq(ProductFileRel::getProductId, productId)
                .orderByAsc(ProductFileRel::getSortOrder)));
    }

    @PutMapping("/files")
    @PreAuthorize("hasAuthority('product:update')")
    @Operation(summary = "覆盖保存商品资料关联")
    public R<Void> saveFiles(@PathVariable Long productId, @RequestBody List<Long> fileIds) {
        productFileRelMapper.delete(new LambdaQueryWrapper<ProductFileRel>()
                .eq(ProductFileRel::getProductId, productId));
        if (fileIds != null) {
            int sort = 0;
            for (Long fileId : fileIds) {
                if (fileId == null) continue;
                ProductFileRel rel = new ProductFileRel();
                rel.setProductId(productId);
                rel.setFileId(fileId);
                rel.setSortOrder(sort++);
                productFileRelMapper.insert(rel);
            }
        }
        return R.ok();
    }

    @Data
    public static class ImportCodesBody {
        private List<String> codes;
    }

    @PostMapping("/card-codes")
    @PreAuthorize("hasAuthority('product:update')")
    @Operation(summary = "批量导入卡密（服务端 AES-GCM 加密后入库）")
    public R<Integer> importCodes(@PathVariable Long productId, @RequestBody ImportCodesBody body) {
        int n = 0;
        if (body != null && body.getCodes() != null) {
            for (String code : body.getCodes()) {
                if (code == null || code.isBlank()) continue;
                ProductCardCode row = new ProductCardCode();
                row.setProductId(productId);
                row.setCodeCipher(cardCodeCrypto.encrypt(code.trim()));
                row.setStatus("available");
                row.setCreatedAt(LocalDateTime.now());
                productCardCodeMapper.insert(row);
                n++;
            }
        }
        return R.ok(n);
    }
}
