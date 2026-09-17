package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("mp_purchase_entitlement")
public class PurchaseEntitlement implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long productId;
    private Long orderId;
    private String orderNo;
    /** product / file / content */
    private String entitlementType;
    private Long refId;
    /** active / revoked */
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
