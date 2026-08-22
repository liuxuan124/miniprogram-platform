package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("mp_member_task")
public class MemberTask {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String code;
    private String name;
    private Integer points;
    private Integer dailyLimit;
    private Integer enabled;
}
