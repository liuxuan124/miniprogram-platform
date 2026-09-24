package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("mp_paid_qa_question")
public class PaidQaQuestion {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String title;
    private String body;
    private String imagesJson;
    private String visibility;
    private BigDecimal priceAmount;
    private Long orderId;
    private String status;
    private String answerBody;
    private LocalDateTime answerAt;
    private LocalDateTime timeoutAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
