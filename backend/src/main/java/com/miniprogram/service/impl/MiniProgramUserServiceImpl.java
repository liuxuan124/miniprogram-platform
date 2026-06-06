package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.MiniProgramUserQueryDTO;
import com.miniprogram.dto.MiniProgramUserVO;
import com.miniprogram.entity.MiniProgramUser;
import com.miniprogram.mapper.MiniProgramUserMapper;
import com.miniprogram.service.MiniProgramUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * 小程序用户管理 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MiniProgramUserServiceImpl extends BaseServiceImpl<MiniProgramUserMapper, MiniProgramUser> implements MiniProgramUserService {

    @Override
    public PageResult<MiniProgramUserVO> listUsers(MiniProgramUserQueryDTO queryDTO) {
        LambdaQueryWrapper<MiniProgramUser> wrapper = new LambdaQueryWrapper<>();
        wrapper.like(StringUtils.hasText(queryDTO.getKeyword()), MiniProgramUser::getNickname, queryDTO.getKeyword());
        wrapper.like(StringUtils.hasText(queryDTO.getPhone()), MiniProgramUser::getPhone, queryDTO.getPhone());
        wrapper.eq(StringUtils.hasText(queryDTO.getSource()), MiniProgramUser::getSourceChannel, queryDTO.getSource());
        wrapper.orderByDesc(MiniProgramUser::getCreateTime);

        Page<MiniProgramUser> page = this.page(new Page<>(queryDTO.getCurrent(), queryDTO.getSize()), wrapper);

        PageResult<MiniProgramUserVO> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setCurrent(page.getCurrent());
        result.setSize(page.getSize());
        result.setRecords(page.getRecords().stream().map(this::toVO).toList());
        return result;
    }

    @Override
    public MiniProgramUserVO getUserProfile(Long id) {
        MiniProgramUser user = this.getById(id);
        if (user == null) {
            throw new BusinessException(4001, "用户不存在");
        }
        return toVO(user);
    }

    private MiniProgramUserVO toVO(MiniProgramUser user) {
        MiniProgramUserVO vo = new MiniProgramUserVO();
        BeanUtils.copyProperties(user, vo);
        return vo;
    }
}
