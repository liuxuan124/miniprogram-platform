package com.miniprogram.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.miniprogram.entity.RuntimeEvent;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.Map;

@Mapper
public interface RuntimeEventMapper extends BaseMapper<RuntimeEvent> {

    /** 按类型统计事件数：算错误率 / 白屏率 */
    @Select("SELECT event_type, COUNT(*) AS cnt, COUNT(DISTINCT session_id) AS session_cnt " +
            "FROM mp_runtime_event " +
            "WHERE created_at BETWEEN #{start} AND #{end} " +
            "GROUP BY event_type")
    List<Map<String, Object>> countByType(@Param("start") String start, @Param("end") String end);

    /** 错误 Top 页面：定位问题最需要的一张表 */
    @Select("SELECT page_path, COUNT(*) AS cnt " +
            "FROM mp_runtime_event " +
            "WHERE created_at BETWEEN #{start} AND #{end} AND event_type = 'error' " +
            "GROUP BY page_path ORDER BY cnt DESC LIMIT #{limit}")
    List<Map<String, Object>> topErrorPages(@Param("start") String start,
                                            @Param("end") String end,
                                            @Param("limit") int limit);

    /** Tab 切走明细：from → to 次数，算哪个入口把人带走 */
    @Select("SELECT from_route, to_route, COUNT(*) AS cnt " +
            "FROM mp_runtime_event " +
            "WHERE created_at BETWEEN #{start} AND #{end} AND event_type = 'tab_leave' " +
            "GROUP BY from_route, to_route ORDER BY cnt DESC LIMIT #{limit}")
    List<Map<String, Object>> tabLeaveStats(@Param("start") String start,
                                            @Param("end") String end,
                                            @Param("limit") int limit);

    @Delete("DELETE FROM mp_runtime_event WHERE created_at < #{before} LIMIT #{limit}")
    int deleteOlderThan(@Param("before") String before, @Param("limit") int limit);
}
