package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_planet_homework_submission")
public class PlanetHomeworkSubmission {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long homeworkId;
    private Long userId;
    private String body;
    private String attachmentsJson;
    private String auditStatus;
    private LocalDateTime createdAt;
}
