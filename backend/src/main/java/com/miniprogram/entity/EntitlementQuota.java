package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_entitlement_quota")
public class EntitlementQuota {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String quotaType;
    private Integer balance;
    private String periodKey;
    private LocalDateTime updatedAt;
}
