package com.miniprogram.service;

import com.baomidou.mybatisplus.extension.service.IService;

/**
 * 基础 Service 接口
 * 继承 MyBatis-Plus 的 IService，提供基础 CRUD 能力
 *
 * @param <T> 实体类型
 */
public interface BaseService<T> extends IService<T> {
}
