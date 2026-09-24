package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_planet_homework")
public class PlanetHomework {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String planetId;
    private String title;
    private String body;
    private LocalDateTime dueAt;
    private String status;
    private LocalDateTime createdAt;
}
