package com.miniprogram.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.miniprogram.entity.AgentCallLog;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.Map;

public interface AgentCallLogMapper extends BaseMapper<AgentCallLog> {

    @Select("""
            SELECT COUNT(*) AS callCount,
                   IFNULL(SUM(prompt_tokens + completion_tokens), 0) AS tokenSum,
                   IFNULL(SUM(cost_estimate), 0) AS costSum
            FROM mp_agent_call_log
            WHERE agent_role = #{role}
              AND create_time >= CURDATE()
            """)
    Map<String, Object> todayStatsByRole(@Param("role") String role);
}
