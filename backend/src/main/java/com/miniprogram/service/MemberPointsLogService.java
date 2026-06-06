package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.member.PointsLogQueryDTO;
import com.miniprogram.dto.member.PointsLogVO;
import com.miniprogram.entity.MemberPointsLog;

public interface MemberPointsLogService extends BaseService<MemberPointsLog> {
    PageResult<PointsLogVO> listPointsLogs(PointsLogQueryDTO queryDTO);
    PointsLogVO addPointsLog(Long userId, Integer points, String type, String description);
}
