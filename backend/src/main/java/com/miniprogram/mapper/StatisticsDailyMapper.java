package com.miniprogram.mapper;

import com.miniprogram.entity.StatisticsDaily;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 日统计汇总 Mapper
 */
public interface StatisticsDailyMapper extends BaseMapper<StatisticsDaily> {

    /**
     * 按日期范围查询统计汇总
     */
    @Select("SELECT * FROM mp_statistics_daily WHERE stat_date BETWEEN #{startDate} AND #{endDate} ORDER BY stat_date ASC")
    List<StatisticsDaily> selectByDateRange(@Param("startDate") LocalDate startDate,
                                            @Param("endDate") LocalDate endDate);

    /**
     * 查询指定日期的统计汇总
     */
    @Select("SELECT * FROM mp_statistics_daily WHERE stat_date = #{statDate}")
    StatisticsDaily selectByStatDate(@Param("statDate") LocalDate statDate);
}
