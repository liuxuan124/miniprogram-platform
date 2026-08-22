package com.miniprogram.mapper;

import com.miniprogram.entity.Activity;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

public interface ActivityMapper extends BaseMapper<Activity> {

    @Update("UPDATE mp_activity SET signed = IFNULL(signed,0) + 1 " +
            "WHERE id = #{id} AND (quota IS NULL OR quota = 0 OR IFNULL(signed,0) < quota)")
    int tryOccupySeat(@Param("id") Long id);

    @Update("UPDATE mp_activity SET signed = GREATEST(IFNULL(signed,0) - 1, 0) WHERE id = #{id}")
    int releaseSeat(@Param("id") Long id);
}
