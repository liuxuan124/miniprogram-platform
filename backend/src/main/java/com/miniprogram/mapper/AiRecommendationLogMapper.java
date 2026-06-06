package com.miniprogram.mapper;

import com.miniprogram.entity.AiRecommendationLog;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 推荐日志 Mapper
 */
@Mapper
public interface AiRecommendationLogMapper extends BaseMapper<AiRecommendationLog> {

    /**
     * 统计指定时间范围内的推荐次数（按类型分组）
     */
    @Select("SELECT item_type AS itemType, COUNT(*) AS count " +
            "FROM mp_ai_recommendation_log " +
            "WHERE deleted = 0 " +
            "AND created_at >= #{startTime} " +
            "AND created_at <= #{endTime} " +
            "GROUP BY item_type")
    List<Map<String, Object>> countByItemType(@Param("startTime") LocalDateTime startTime,
                                               @Param("endTime") LocalDateTime endTime);

    /**
     * 统计指定时间范围内的点击次数（按类型分组）
     */
    @Select("SELECT item_type AS itemType, COUNT(*) AS count " +
            "FROM mp_ai_recommendation_log " +
            "WHERE deleted = 0 " +
            "AND is_clicked = 1 " +
            "AND created_at >= #{startTime} " +
            "AND created_at <= #{endTime} " +
            "GROUP BY item_type")
    List<Map<String, Object>> countClickedByItemType(@Param("startTime") LocalDateTime startTime,
                                                      @Param("endTime") LocalDateTime endTime);
}
