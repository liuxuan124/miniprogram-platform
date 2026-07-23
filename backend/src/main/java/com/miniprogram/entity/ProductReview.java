package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("mp_product_review")
public class ProductReview implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId
    private Long id;
    private Long productId;
    private Long userId;
    private Long orderId;
    private Integer score;
    private String tags;
    private String content;
    private String images;
    private Integer anonymous;
    private String nickname;
    private String avatar;
    private Integer status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
