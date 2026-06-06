package com.miniprogram.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.dto.LoginDTO;
import com.miniprogram.dto.LoginVO;
import com.miniprogram.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 管理后台认证接口契约测试。
 */
class AuthControllerIntegrationTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = mock(AuthService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new AuthController(authService)).build();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("登录接口 - 成功返回访问令牌")
    void should_returnToken_when_loginSuccess() throws Exception {
        LoginDTO loginDTO = new LoginDTO();
        loginDTO.setUsername("admin");
        loginDTO.setPassword("123456");

        LoginVO loginVO = LoginVO.builder()
                .accessToken("test-jwt-token")
                .refreshToken("test-refresh-token")
                .tokenType("Bearer")
                .username("admin")
                .build();
        when(authService.login(any(LoginDTO.class))).thenReturn(loginVO);

        mockMvc.perform(post("/api/v1/admin/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.accessToken").value("test-jwt-token"));
    }
}
