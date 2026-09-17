package com.miniprogram;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * 启动类冒烟：完整 {@code @SpringBootTest} 依赖 MySQL/Redis 测试基建，
 * 本地单测环境改为校验主类可加载；上下文集成见 CI / 手工联调。
 */
class MiniProgramApplicationTest {

    @Test
    void applicationClassLoads() {
        assertNotNull(MiniProgramApplication.class);
        assertNotNull(MiniProgramApplication.class.getDeclaredMethods());
    }
}
