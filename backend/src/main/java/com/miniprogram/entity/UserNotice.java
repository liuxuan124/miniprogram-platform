package com.miniprogram.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_user_notice")
public class UserNotice {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String bizKey;
    private String scene;
    private String title;
    private String content;
    private String link;
    @JsonProperty("isRead")
    private Integer isRead;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
