package com.miniprogram.service;

import java.time.Duration;

/**
 * 短信验证码存储（Redis 生产实现；测试可用内存实现）。
 */
public interface SmsCodeStore {

    void set(String key, String value, Duration ttl);

    String get(String key);

    void delete(String key);

    boolean setIfAbsent(String key, String value, Duration ttl);

    long increment(String key, Duration ttlIfNew);
}
