package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_member_task_log")
public class MemberTaskLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String taskCode;
    private Integer points;
    private String bizId;
    private LocalDateTime createTime;
}
