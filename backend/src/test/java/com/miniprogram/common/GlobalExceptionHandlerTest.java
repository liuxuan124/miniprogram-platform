package com.miniprogram.common;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessException;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.*;

/**
 * FP-API-078：服务端 500 时统一错误结构（code + message）
 */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("未捕获异常 → HTTP 500 语义 R，含 code 与 message")
    void handleException_returnsStructuredError() {
        HttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/admin/pages/1");

        R<Void> result = handler.handleException(new RuntimeException("probe"), request);

        assertNotNull(result);
        assertEquals(500, result.getCode());
        assertNotNull(result.getMessage());
        assertFalse(result.getMessage().isBlank());
    }

    @Test
    @DisplayName("DataAccessException → 500 语义 R，含 code 与 message")
    void handleDataAccessException_returnsStructuredError() {
        HttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/admin/pages/1/draft");
        DataAccessException ex = new DataAccessException("save failed") {};

        R<Void> result = handler.handleDataAccessException(ex, request);

        assertNotNull(result);
        assertEquals(500, result.getCode());
        assertNotNull(result.getMessage());
        assertFalse(result.getMessage().isBlank());
    }
}
