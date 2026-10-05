package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/** 客服 IM 消息。富媒体结构存 payload JSON，text_content 冗余供列表预览与搜索。 */
@Data
@TableName("im_message")
public class ImMessage implements Serializable {
    private static final long serialVersionUID = 1L;

    /** 富媒体消息类型常量 —— 端上渲染按此分派。 */
    public static final String TYPE_TEXT = "text";
    public static final String TYPE_IMAGE = "image";
    public static final String TYPE_PRODUCT_CARD = "product_card";
    public static final String TYPE_LOGISTICS_CARD = "logistics_card";
    public static final String TYPE_SYSTEM_EVENT = "system_event";

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long conversationId;
    /** 会话内单调递增游标，断线重连按此续传 */
    private Integer seq;
    /** user 买家 / agent 客服 / system 系统小助手 */
    private String senderRole;
    private Long senderId;
    private String senderName;
    /** text / image / product_card / logistics_card / system_event */
    private String msgType;
    /** 富媒体结构 JSON */
    private String payload;
    @TableField("text_content")
    private String textContent;
    @TableField("read_by_user")
    private Integer readByUser;
    @TableField("read_by_agent")
    private Integer readByAgent;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField("create_time")
    private LocalDateTime createTime;
}
