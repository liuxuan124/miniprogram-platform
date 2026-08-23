package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("mp_agent_knowledge")
@Schema(description = "AI Agent 知识库文件")
public class AgentKnowledge implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long configId;

    /** file|content|qa|product|manual */
    private String sourceType;

    private Long sourceId;

    private String fileName;
    private Long fileSize;
    private String fileUrl;
    private String vectorStatus;
    private String statusMessage;
    private Integer chunkCount;
    private LocalDateTime lastSyncedAt;
    private BigDecimal recallWeight;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
