package com.miniprogram.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("mp_agent_version")
@Schema(description = "AI Agent 版本快照")
public class AgentVersion implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private Integer version;
    /** JSON 字符串 */
    private String configJson;
    private String changelog;
    /** 0=草稿 1=已发布 2=已回滚 */
    private Integer status;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
