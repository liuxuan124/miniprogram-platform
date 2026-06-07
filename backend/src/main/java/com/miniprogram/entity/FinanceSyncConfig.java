package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("mp_finance_sync_config")
public class FinanceSyncConfig implements Serializable {

    @TableId
    private Long id;

    private String source;

    @TableField("source_name")
    private String sourceName;

    private Boolean enabled;

    @TableField("sync_interval")
    private Integer syncInterval;

    @TableField("auto_sync")
    private Boolean autoSync;

    @TableField("last_sync_time")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime lastSyncTime;

    @TableField("last_sync_status")
    private String lastSyncStatus;

    @TableField("last_record_count")
    private Integer lastRecordCount;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("created_at")
    private LocalDateTime createTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("updated_at")
    private LocalDateTime updateTime;
}
