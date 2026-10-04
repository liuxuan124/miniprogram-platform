package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.entity.Channel;
import com.miniprogram.entity.Order;
import com.miniprogram.mapper.ChannelMapper;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.service.ChannelService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChannelServiceImpl implements ChannelService {

    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final ChannelMapper channelMapper;
    private final OrderMapper orderMapper;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public Channel save(Channel row) {
        if (!StringUtils.hasText(row.getChannelName())) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "渠道名称不能为空");
        }
        if (row.getCommissionRate() == null) row.setCommissionRate(new BigDecimal("0.1000"));
        if (row.getStatus() == null) row.setStatus(1);
        if (row.getChannelType() == null) row.setChannelType("general");

        if (row.getId() == null) {
            // 新建：生成唯一 channelKey
            if (!StringUtils.hasText(row.getChannelKey())) {
                row.setChannelKey(generateUniqueKey());
            } else {
                // 校验自定义 key 不重复
                Long cnt = channelMapper.selectCount(new LambdaQueryWrapper<Channel>()
                        .eq(Channel::getChannelKey, row.getChannelKey().trim()));
                if (cnt != null && cnt > 0) {
                    throw new BusinessException(ErrorCode.PARAM_ERROR, "渠道码已存在: " + row.getChannelKey());
                }
            }
            channelMapper.insert(row);
        } else {
            row.setUpdateTime(LocalDateTime.now());
            channelMapper.updateById(row);
        }
        return row;
    }

    @Override
    public List<Channel> listAll(Integer status) {
        return channelMapper.selectList(new LambdaQueryWrapper<Channel>()
                .eq(status != null, Channel::getStatus, status)
                .orderByDesc(Channel::getCreateTime));
    }

    @Override
    public Channel resolveByKey(String channelKey) {
        if (!StringUtils.hasText(channelKey)) return null;
        Channel ch = channelMapper.selectOne(new LambdaQueryWrapper<Channel>()
                .eq(Channel::getChannelKey, channelKey.trim().toUpperCase())
                .eq(Channel::getStatus, 1)
                .last("LIMIT 1"));
        return ch;
    }

    @Override
    public void delete(Long id) {
        if (id == null) return;
        channelMapper.deleteById(id);
    }

    @Override
    public List<Map<String, Object>> report(LocalDateTime from, LocalDateTime to, Long channelId) {
        StringBuilder sql = new StringBuilder(
            "SELECT c.id AS channelId, c.channel_key AS channelKey, c.channel_name AS channelName, c.channel_type AS channelType, " +
            "COUNT(o.id) AS orderCount, " +
            "COALESCE(SUM(o.pay_amount), 0) AS gmv, " +
            "COALESCE(SUM(CASE WHEN o.status IN ('paid','shipped','completed') THEN o.pay_amount ELSE 0 END), 0) AS paidGmv, " +
            "COALESCE(SUM(CASE WHEN o.status IN ('paid','shipped','completed') THEN o.pay_amount * c.commission_rate ELSE 0 END), 0) AS commission " +
            "FROM mp_channel c LEFT JOIN mp_order o ON o.channel_id = c.id " +
            "WHERE 1=1 "
        );
        List<Object> params = new ArrayList<>();
        if (from != null) {
            sql.append("AND o.created_at >= ? ");
            params.add(from);
        }
        if (to != null) {
            sql.append("AND o.created_at <= ? ");
            params.add(to);
        }
        if (channelId != null) {
            sql.append("AND c.id = ? ");
            params.add(channelId);
        }
        sql.append("GROUP BY c.id, c.channel_key, c.channel_name, c.channel_type ");
        sql.append("ORDER BY paidGmv DESC");

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql.toString(), params.toArray());

        // 转换 BigDecimal 精度
        List<Map<String, Object>> result = new ArrayList<>(rows.size());
        for (Map<String, Object> r : rows) {
            Map<String, Object> m = new HashMap<>(r);
            Object gmv = m.get("gmv");
            Object paidGmv = m.get("paidGmv");
            Object commission = m.get("commission");
            if (gmv instanceof BigDecimal) m.put("gmv", ((BigDecimal) gmv).setScale(2, RoundingMode.HALF_UP));
            if (paidGmv instanceof BigDecimal) m.put("paidGmv", ((BigDecimal) paidGmv).setScale(2, RoundingMode.HALF_UP));
            if (commission instanceof BigDecimal) m.put("commission", ((BigDecimal) commission).setScale(2, RoundingMode.HALF_UP));
            result.add(m);
        }
        return result;
    }

    private String generateUniqueKey() {
        for (int i = 0; i < 8; i++) {
            String candidate = randomKey(6);
            Long cnt = channelMapper.selectCount(new LambdaQueryWrapper<Channel>()
                    .eq(Channel::getChannelKey, candidate));
            if (cnt == null || cnt == 0) return candidate;
        }
        throw new BusinessException(500001, "渠道码生成失败，请重试");
    }

    private static String randomKey(int len) {
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }
}