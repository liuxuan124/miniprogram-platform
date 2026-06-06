package com.miniprogram.mapper;

import com.miniprogram.entity.PageAccessLog;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 页面访问日志 Mapper
 */
public interface PageAccessLogMapper extends BaseMapper<PageAccessLog> {

    /**
     * 按日期范围统计页面访问量
     */
    @Select("SELECT page_path, COUNT(*) AS access_count, COUNT(DISTINCT user_id) AS visitor_count, " +
            "IFNULL(AVG(stay_duration), 0) AS avg_stay_duration " +
            "FROM mp_page_access_log " +
            "WHERE created_at BETWEEN #{startDateTime} AND #{endDateTime} " +
            "GROUP BY page_path " +
            "ORDER BY access_count DESC")
    List<Map<String, Object>> selectPageAccessStats(@Param("startDateTime") String startDateTime,
                                                     @Param("endDateTime") String endDateTime);

    /**
     * 按日期范围统计每日访问量
     */
    @Select("SELECT DATE(created_at) AS stat_date, COUNT(*) AS access_count, COUNT(DISTINCT user_id) AS visitor_count " +
            "FROM mp_page_access_log " +
            "WHERE created_at BETWEEN #{startDateTime} AND #{endDateTime} " +
            "GROUP BY DATE(created_at) " +
            "ORDER BY stat_date ASC")
    List<Map<String, Object>> selectDailyAccessStats(@Param("startDateTime") String startDateTime,
                                                      @Param("endDateTime") String endDateTime);
}
