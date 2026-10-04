package com.miniprogram.service;

import com.miniprogram.dto.home.WarmHomeVO;

/**
 * 暖阁首页聚合
 */
public interface WarmHomeService {

    /**
     * @param userId 当前登录用户；可为 null（未登录），此时按配置 primary 星球聚合，不做主星球收敛
     */
    WarmHomeVO getWarmHome(Long userId);
}
