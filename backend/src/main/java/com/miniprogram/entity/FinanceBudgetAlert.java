package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("mp_finance_budget_alert")
public class FinanceBudgetAlert implements Serializable {

    @TableId
    private Long id;

    @TableField("budget_id")
    private Long budgetId;

    private String category;

    @TableField("alert_level")
    private String alertLevel;

    private Boolean handled;

    @TableField("handle_note")
    private String handleNote;

    @TableField("handled_at")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime handledAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("created_at")
    private LocalDateTime createTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("updated_at")
    private LocalDateTime updateTime;
}
