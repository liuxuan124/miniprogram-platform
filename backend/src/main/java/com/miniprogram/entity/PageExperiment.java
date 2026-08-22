package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_page_experiment")
public class PageExperiment {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long pageId;
    private String name;
    private Long versionA;
    private Long versionB;
    private Integer trafficB;
    private String status;
    private String winner;
    private LocalDateTime createTime;
}
