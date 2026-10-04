package com.miniprogram.service;

import com.miniprogram.entity.Channel;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface ChannelService {
    /** 创建或更新渠道 */
    Channel save(Channel row);

    /** 列全部启用渠道 */
    List<Channel> listAll(Integer status);

    /** 按 channelKey 解析（小程序入口用） */
    Channel resolveByKey(String channelKey);

    /** 删除 */
    void delete(Long id);

    /** 渠道报表：某时间段内各渠道订单数、GMV、佣金 */
    List<Map<String, Object>> report(LocalDateTime from, LocalDateTime to, Long channelId);
}