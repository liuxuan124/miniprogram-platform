package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("mp_product_file_rel")
public class ProductFileRel {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long productId;
    private Long fileId;
    private Integer sortOrder;
}
