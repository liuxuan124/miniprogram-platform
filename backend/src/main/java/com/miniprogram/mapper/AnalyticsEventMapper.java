package com.miniprogram.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.miniprogram.entity.AnalyticsEvent;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AnalyticsEventMapper extends BaseMapper<AnalyticsEvent> {

    @Delete("DELETE FROM mp_analytics_event WHERE create_time < #{before} LIMIT #{limit}")
    int deleteOlderThan(@Param("before") String before, @Param("limit") int limit);
}
