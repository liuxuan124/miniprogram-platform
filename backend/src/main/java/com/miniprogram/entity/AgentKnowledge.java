package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
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

    /** V25 无此列，避免 INSERT/SELECT 把 config_id 带上 */
    @TableField(exist = false)
    private Long configId;

    private String fileName;
    private Long fileSize;
    private String fileUrl;
    private String vectorStatus;
    private BigDecimal recallWeight;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
