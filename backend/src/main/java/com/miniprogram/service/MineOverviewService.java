package com.miniprogram.service;

import com.miniprogram.dto.mine.MineOverviewVO;

public interface MineOverviewService {
    MineOverviewVO getOverview(Long userId);
}
