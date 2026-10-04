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
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroupQrcodeServiceImpl implements GroupQrcodeService {

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