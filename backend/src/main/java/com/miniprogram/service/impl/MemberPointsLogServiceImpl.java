package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.member.PointsLogQueryDTO;
import com.miniprogram.dto.member.PointsLogVO;
import com.miniprogram.entity.MemberPointsLog;
import com.miniprogram.mapper.MemberPointsLogMapper;
import com.miniprogram.service.MemberPointsLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberPointsLogServiceImpl extends BaseServiceImpl<MemberPointsLogMapper, MemberPointsLog> implements MemberPointsLogService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    public PageResult<PointsLogVO> listPointsLogs(PointsLogQueryDTO queryDTO) {
        LambdaQueryWrapper<MemberPointsLog> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(queryDTO.getUserId() != null, MemberPointsLog::getUserId, queryDTO.getUserId());
        wrapper.eq(queryDTO.getType() != null && !queryDTO.getType().isBlank(), MemberPointsLog::getType, queryDTO.getType());
        wrapper.orderByDesc(MemberPointsLog::getCreateTime);

        Page<MemberPointsLog> page = this.page(new Page<>(queryDTO.getPage(), queryDTO.getSize()), wrapper);

        PageResult<PointsLogVO> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setCurrent(page.getCurrent());
        result.setSize(page.getSize());
        result.setRecords(page.getRecords().stream().map(this::toVO).toList());
        return result;
    }

    @Override
    public PointsLogVO addPointsLog(Long userId, Integer points, String type, String description) {
        MemberPointsLog log = new MemberPointsLog();
        log.setUserId(userId);
        log.setPoints(points);
        log.setType(type);
        log.setDescription(description);
        this.save(log);
        return toVO(log);
    }

    private PointsLogVO toVO(MemberPointsLog entity) {
        PointsLogVO vo = new PointsLogVO();
        BeanUtils.copyProperties(entity, vo);
        vo.setCreatedAt(entity.getCreateTime() != null ? DATE_TIME_FORMATTER.format(entity.getCreateTime()) : null);
        return vo;
    }
}
