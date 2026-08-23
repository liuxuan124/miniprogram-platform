package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("mp_agent_knowledge_chunk")
public class AgentKnowledgeChunk implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long knowledgeId;
    private Long configId;
    private Integer seq;
    private String title;
    private String body;
    private Integer charLen;
    private String sourceRef;
    private Integer hitCount;
    /** 1=启用 0=停用 */
    private Integer status;
    private LocalDateTime createTime;
}
