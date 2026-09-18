package com.miniprogram.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.miniprogram.entity.User;
import org.apache.ibatis.annotations.Mapper;

/**
 * 小程序用户 Mapper
 */
@Mapper
public interface UserMapper extends BaseMapper<User> {
}
