package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_fulfillment_log")
public class FulfillmentLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long orderId;
    private String orderNo;
    private Long userId;
    private Long productId;
    private Integer attemptNo;
    private String status;
    private String detailJson;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
