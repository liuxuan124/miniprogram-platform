package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.miniprogram.mapper.BaseMapper;
import com.miniprogram.service.BaseService;

/**
 * 基础 Service 实现类
 * 继承 MyBatis-Plus 的 ServiceImpl，提供基础 CRUD 实现
 *
 * @param <M> Mapper 类型
 * @param <T> 实体类型
 */
public class BaseServiceImpl<M extends BaseMapper<T>, T> extends ServiceImpl<M, T> implements BaseService<T> {
}
