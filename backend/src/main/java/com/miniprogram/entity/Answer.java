package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.miniprogram.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mp_answer")
public class Answer extends BaseEntity {
    private static final long serialVersionUID = 1L;

    private Long questionId;
    private Long adminUserId;
    private String content;
    private String attachments;
    private LocalDateTime publishedAt;
}
