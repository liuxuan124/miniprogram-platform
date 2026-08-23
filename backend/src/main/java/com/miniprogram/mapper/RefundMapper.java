package com.miniprogram.mapper;

import com.miniprogram.entity.Refund;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.Map;

/**
 * 退款记录 Mapper
 */
public interface RefundMapper extends BaseMapper<Refund> {

    @Select("SELECT COUNT(*) AS cnt, IFNULL(SUM(amount), 0) AS amount " +
            "FROM mp_refund WHERE created_at BETWEEN #{start} AND #{end} " +
            "AND status = 'success'")
    Map<String, Object> sumRefundsBetween(@Param("start") String start, @Param("end") String end);
}
