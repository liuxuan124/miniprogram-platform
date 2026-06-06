package com.miniprogram.common;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 统一响应体 R 测试
 */
class RTest {

    @Test
    void testOk() {
        R<String> result = R.ok("test data");
        assertEquals(200, result.getCode());
        assertEquals("操作成功", result.getMessage());
        assertEquals("test data", result.getData());
    }

    @Test
    void testOkWithoutData() {
        R<Void> result = R.ok();
        assertEquals(200, result.getCode());
        assertNull(result.getData());
    }

    @Test
    void testFail() {
        R<Void> result = R.fail("操作失败");
        assertEquals(500, result.getCode());
        assertEquals("操作失败", result.getMessage());
    }

    @Test
    void testFailWithCode() {
        R<Void> result = R.fail(400, "参数错误");
        assertEquals(400, result.getCode());
        assertEquals("参数错误", result.getMessage());
    }

    @Test
    void testUnauthorized() {
        R<Void> result = R.unauthorized("未登录");
        assertEquals(401, result.getCode());
    }

    @Test
    void testForbidden() {
        R<Void> result = R.forbidden("无权限");
        assertEquals(403, result.getCode());
    }
}
