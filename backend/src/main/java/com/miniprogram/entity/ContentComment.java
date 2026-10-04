package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mp_content_comment")
public class ContentComment {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long contentId;
    /** 父评论ID，NULL 表示楼主评论；非 NULL 表示二级回复 */
    private Long parentId;
    /** 被回复用户ID（仅回复时有值） */
    private Long replyToUserId;
    /** 被回复用户昵称（仅回复时有值，冗余避免二次查询） */
    private String replyToNickname;
    private Long userId;
    private String nickname;
    private String avatar;
    private String content;
    private Integer status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    @TableLogic
    private Integer deleted;
}
