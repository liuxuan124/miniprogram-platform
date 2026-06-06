package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.member.MemberLevelDTO;
import com.miniprogram.dto.member.MemberLevelVO;
import com.miniprogram.entity.MemberLevel;

import java.util.List;

/**
 * 会员等级 Service
 */
public interface MemberLevelService extends BaseService<MemberLevel> {

    /**
     * 获取所有会员等级列表
     */
    List<MemberLevelVO> listAll();

    /**
     * 创建会员等级
     */
    MemberLevelVO createLevel(MemberLevelDTO dto);

    /**
     * 更新会员等级
     */
    MemberLevelVO updateLevel(Long id, MemberLevelDTO dto);

    /**
     * 删除会员等级
     */
    void deleteLevel(Long id);

    /**
     * 根据积分计算对应等级
     */
    MemberLevel calculateLevel(Integer points);
}
