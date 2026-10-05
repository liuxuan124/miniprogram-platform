package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.entity.GroupQrcode;
import com.miniprogram.mapper.GroupQrcodeMapper;
import com.miniprogram.service.GroupQrcodeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroupQrcodeServiceImpl implements GroupQrcodeService {

    /** 单次批量取码的最大 groupKey 数量，防单请求放大。 */
    static final int MAX_BATCH_KEYS = 50;

    private final GroupQrcodeMapper mapper;

    @Override
    public GroupQrcode getCurrentQrcode(String groupKey) {
        if (!StringUtils.hasText(groupKey)) return null;
        LocalDateTime now = LocalDateTime.now();
        // 取启用的、未过期的（valid_until IS NULL 或 > now），按 sort_order 升序第一个
        List<GroupQrcode> list = mapper.selectList(new LambdaQueryWrapper<GroupQrcode>()
                .eq(GroupQrcode::getGroupKey, groupKey)
                .eq(GroupQrcode::getStatus, 1)
                .and(w -> w.isNull(GroupQrcode::getValidUntil).or().gt(GroupQrcode::getValidUntil, now))
                .orderByAsc(GroupQrcode::getSortOrder)
                .last("LIMIT 1"));
        return list.isEmpty() ? null : list.get(0);
    }

    @Override
    public Map<String, GroupQrcode> getCurrentQrcodes(List<String> groupKeys) {
        Map<String, GroupQrcode> result = new LinkedHashMap<>();
        if (groupKeys == null || groupKeys.isEmpty()) {
            return result;
        }
        // 2026-10-05 审计：原实现对每个 key 调一次 getCurrentQrcode（循环内 selectByQuery），
        // N 个 key = N 次 SQL。/batch 是匿名接口且 groupKeys 无长度上限，
        // 单请求可塞数千 key → 每分钟几十万次查询，限流拦不住这个放大器。
        // 改为：service 侧再兜一层上限（Controller 的 @Size 只是第一道），
        // 然后单条 IN 查询取回，内存里按 sortOrder 取每组首条 —— 既消除 N+1 又天然封顶。
        List<String> keys = groupKeys.stream()
                .map(k -> k == null ? "" : k.trim())
                .filter(k -> !k.isEmpty())
                .distinct()
                .limit(MAX_BATCH_KEYS)
                .collect(Collectors.toList());
        if (keys.isEmpty()) {
            return result;
        }
        LocalDateTime now = LocalDateTime.now();
        List<GroupQrcode> all = mapper.selectList(new LambdaQueryWrapper<GroupQrcode>()
                .in(GroupQrcode::getGroupKey, keys)
                .eq(GroupQrcode::getStatus, 1)
                .and(w -> w.isNull(GroupQrcode::getValidUntil).or().gt(GroupQrcode::getValidUntil, now))
                .orderByAsc(GroupQrcode::getSortOrder));
        for (GroupQrcode qr : all) {
            // 同一 groupKey 可能有多条（轮换批次），按 sortOrder 升序只取第一条
            result.putIfAbsent(qr.getGroupKey(), qr);
        }
        return result;
    }

    @Override
    public List<GroupQrcode> listByGroup(String groupKey) {
        return mapper.selectList(new LambdaQueryWrapper<GroupQrcode>()
                .eq(StringUtils.hasText(groupKey), GroupQrcode::getGroupKey, groupKey)
                .orderByAsc(GroupQrcode::getGroupKey)
                .orderByAsc(GroupQrcode::getSortOrder));
    }

    @Override
    public GroupQrcode save(GroupQrcode row) {
        if (!StringUtils.hasText(row.getGroupKey())) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "群标识不能为空");
        }
        if (!StringUtils.hasText(row.getQrcodeUrl())) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "二维码URL不能为空");
        }
        if (row.getStatus() == null) row.setStatus(1);
        if (row.getSortOrder() == null) row.setSortOrder(0);
        if (row.getId() == null) {
            mapper.insert(row);
        } else {
            row.setUpdateTime(LocalDateTime.now());
            mapper.updateById(row);
        }
        return row;
    }

    @Override
    public void delete(Long id) {
        if (id == null) return;
        mapper.deleteById(id);
    }

    @Override
    public int rotateExpired() {
        LocalDateTime now = LocalDateTime.now();
        // 查已过期但仍启用的码
        List<GroupQrcode> expired = mapper.selectList(new LambdaQueryWrapper<GroupQrcode>()
                .eq(GroupQrcode::getStatus, 1)
                .isNotNull(GroupQrcode::getValidUntil)
                .lt(GroupQrcode::getValidUntil, now));
        int rotated = 0;
        for (GroupQrcode qr : expired) {
            qr.setStatus(0);
            qr.setUpdateTime(now);
            mapper.updateById(qr);
            rotated++;
            log.info("[GroupQrcodeRotate] 群 {} 的码 {} 已过期停用", qr.getGroupKey(), qr.getId());
        }
        return rotated;
    }
}