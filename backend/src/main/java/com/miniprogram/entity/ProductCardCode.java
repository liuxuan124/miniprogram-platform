package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_product_card_code")
public class ProductCardCode {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long productId;
    private String codeCipher;
    private String status;
    private Long orderId;
    private LocalDateTime assignedAt;
    private LocalDateTime createdAt;
}
