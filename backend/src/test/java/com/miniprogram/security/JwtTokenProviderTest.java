package com.miniprogram.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

/**
 * JwtTokenProvider 测试
 */
class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret",
                "miniprogram-platform-jwt-secret-key-must-be-at-least-256-bits-long-for-hs256");
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtExpiration", 86400000L);
        ReflectionTestUtils.setField(jwtTokenProvider, "refreshExpiration", 604800000L);
    }

    @Test
    void testGenerateAndValidateToken() {
        String token = jwtTokenProvider.generateToken(1L, "admin");
        assertNotNull(token);
        assertTrue(jwtTokenProvider.validateToken(token));
    }

    @Test
    void testGetUserIdFromToken() {
        String token = jwtTokenProvider.generateToken(1L, "admin");
        Long userId = jwtTokenProvider.getUserIdFromToken(token);
        assertEquals(1L, userId);
    }

    @Test
    void testGetUsernameFromToken() {
        String token = jwtTokenProvider.generateToken(1L, "admin");
        String username = jwtTokenProvider.getUsernameFromToken(token);
        assertEquals("admin", username);
    }

    @Test
    void testInvalidToken() {
        assertFalse(jwtTokenProvider.validateToken("invalid.token.here"));
    }

    @Test
    void testEmptyToken() {
        assertFalse(jwtTokenProvider.validateToken(""));
    }
}
