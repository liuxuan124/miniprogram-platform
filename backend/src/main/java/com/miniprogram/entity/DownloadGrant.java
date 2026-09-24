package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_download_grant")
public class DownloadGrant {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String tokenHash;
    private Long userId;
    private Long fileId;
    private Integer fileVersion;
    private LocalDateTime expiresAt;
    private LocalDateTime usedAt;
    private LocalDateTime createdAt;
}
