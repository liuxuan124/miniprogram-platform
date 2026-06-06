package com.miniprogram.mapper;

import com.miniprogram.entity.User;
import org.apache.ibatis.annotations.Mapper;

/**
 * 小程序用户 Mapper
 */
@Mapper
public interface UserMapper extends BaseMapper<User> {
}
