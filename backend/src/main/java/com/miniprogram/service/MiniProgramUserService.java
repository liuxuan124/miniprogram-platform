package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.MiniProgramUserQueryDTO;
import com.miniprogram.dto.MiniProgramUserVO;
import com.miniprogram.entity.MiniProgramUser;

/**
 * 小程序用户管理 Service
 */
public interface MiniProgramUserService extends BaseService<MiniProgramUser> {

    /**
     * 分页查询用户列表
     */
    PageResult<MiniProgramUserVO> listUsers(MiniProgramUserQueryDTO queryDTO);

    /**
     * 获取用户画像详情
     */
    MiniProgramUserVO getUserProfile(Long id);
}
