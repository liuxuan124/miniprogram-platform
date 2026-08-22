package com.miniprogram.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ContentCommentDTO {
    private Long id;
    private Long contentId;
    private Long userId;
    private String nickname;
    private String avatar;
    private String content;
    /** 0=待审隐藏 1=公开 */
    private Integer status;
    private LocalDateTime createTime;
}
