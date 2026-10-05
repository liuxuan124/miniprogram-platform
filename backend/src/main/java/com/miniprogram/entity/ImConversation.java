package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/** 客服 IM 会话。 */
@Data
@TableName("im_conversation")
public class ImConversation implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long tenantId;
    private Long userId;
    private String guestKey;
    private Long agentId;
    private String agentName;
    /** waiting 待接入 / active 服务中 / closed 已结束 */
    private String status;
    /** product / order / mine / chat / system */
    private String source;
    private String sourceRef;
    private Long ticketId;
    private String lastMessageType;
    private String lastMessageText;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("last_message_at")
    private LocalDateTime lastMessageAt;
    private Integer userUnread;
    private Integer agentUnread;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("first_reply_at")
    private LocalDateTime firstReplyAt;
    private Integer pinned;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("create_time")
    private LocalDateTime createTime;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("update_time")
    private LocalDateTime updateTime;
}
