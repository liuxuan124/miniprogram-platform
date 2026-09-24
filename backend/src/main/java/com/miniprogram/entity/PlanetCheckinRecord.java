package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_planet_checkin_record")
public class PlanetCheckinRecord {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long themeId;
    private Long userId;
    private String content;
    private String imagesJson;
    private String auditStatus;
    private LocalDateTime createdAt;
}
