package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_content_product")
public class ContentProduct {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long contentId;
    private Long productId;
    private Integer sortOrder;
    private LocalDateTime createTime;
}
