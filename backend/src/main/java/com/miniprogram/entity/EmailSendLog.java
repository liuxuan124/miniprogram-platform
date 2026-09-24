package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_email_send_log")
public class EmailSendLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String email;
    private Long fileId;
    private String grantTokenHash;
    private String status;
    private String errorMsg;
    private LocalDateTime createdAt;
}
