package com.miniprogram.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class ContentCommentDTO {
    private Long id;
    private Long contentId;
    /** 父评论ID，NULL 表示楼主 */
    private Long parentId;
    private Long replyToUserId;
    private String replyToNickname;
    private Long userId;
    private String nickname;
    private String avatar;
    private String content;
    /** 0=待审隐藏 1=公开 */
    private Integer status;
    private LocalDateTime createTime;
    /** 楼主评论下的回复列表（楼中楼），仅对楼主评论下发 */
    private List<ContentCommentDTO> replies;
    /** 回复数量 */
    private Integer replyCount;
}
