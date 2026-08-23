package com.miniprogram.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.miniprogram.entity.AgentKnowledgeChunk;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;
import java.util.Map;

public interface AgentKnowledgeChunkMapper extends BaseMapper<AgentKnowledgeChunk> {

    @Select("""
            SELECT c.id, c.knowledge_id AS knowledgeId, c.title, c.body, c.source_ref AS sourceRef,
                   MATCH(c.title, c.body) AGAINST(#{q} IN NATURAL LANGUAGE MODE) AS score
            FROM mp_agent_knowledge_chunk c
            JOIN mp_agent_knowledge k ON k.id = c.knowledge_id
            WHERE c.status = 1
              AND (c.config_id IS NULL OR c.config_id = #{configId} OR #{configId} IS NULL)
              AND MATCH(c.title, c.body) AGAINST(#{q} IN NATURAL LANGUAGE MODE)
            ORDER BY score * IFNULL(k.recall_weight, 1) DESC
            LIMIT #{limit}
            """)
    List<Map<String, Object>> searchFullText(@Param("q") String question,
                                             @Param("configId") Long configId,
                                             @Param("limit") int limit);

    @Update("UPDATE mp_agent_knowledge_chunk SET hit_count = hit_count + 1 WHERE id = #{id}")
    int incrHitCount(@Param("id") Long id);
}
