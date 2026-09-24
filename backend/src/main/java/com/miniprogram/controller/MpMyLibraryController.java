package com.miniprogram.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.R;
import com.miniprogram.entity.PurchaseEntitlement;
import com.miniprogram.mapper.PurchaseEntitlementMapper;
import com.miniprogram.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@Tag(name = "小程序-我的已购")
@RestController
@RequestMapping("/api/v1/mp/my/library")
@RequiredArgsConstructor
public class MpMyLibraryController {

    private final PurchaseEntitlementMapper purchaseEntitlementMapper;

    @Data
    public static class LibraryItemVO {
        private Long productId;
        private String entitlementType;
        private String orderNo;
    }

    @GetMapping
    @Operation(summary = "已购汇总（商品/专栏/资料权益）")
    public R<List<LibraryItemVO>> list() {
        Long userId = SecurityUtils.getCurrentUserId();
        List<PurchaseEntitlement> rows = purchaseEntitlementMapper.selectList(
                new LambdaQueryWrapper<PurchaseEntitlement>()
                        .eq(PurchaseEntitlement::getUserId, userId)
                        .eq(PurchaseEntitlement::getStatus, "active")
                        .orderByDesc(PurchaseEntitlement::getUpdatedAt));
        List<LibraryItemVO> list = new ArrayList<>();
        for (PurchaseEntitlement row : rows) {
            LibraryItemVO vo = new LibraryItemVO();
            vo.setProductId(row.getProductId());
            vo.setEntitlementType(row.getEntitlementType());
            vo.setOrderNo(row.getOrderNo());
            list.add(vo);
        }
        return R.ok(list);
    }
}
