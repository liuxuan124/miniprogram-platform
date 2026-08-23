package com.miniprogram.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.miniprogram.entity.Order;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.Map;

/**
 * 订单 Mapper
 */
public interface OrderMapper extends BaseMapper<Order> {

    @Select("SELECT COUNT(*) AS cnt, IFNULL(SUM(pay_amount), 0) AS amount " +
            "FROM mp_order WHERE created_at BETWEEN #{start} AND #{end} " +
            "AND status <> 'cancelled'")
    Map<String, Object> sumOrdersBetween(@Param("start") String start, @Param("end") String end);
}
