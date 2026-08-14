package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.config.SecurityConfig;
import com.miniprogram.dto.ActivityVO;
import com.miniprogram.mapper.AdminUserMapper;
import com.miniprogram.mapper.RoleMapper;
import com.miniprogram.security.JwtAuthenticationFilter;
import com.miniprogram.security.JwtTokenProvider;
import com.miniprogram.service.ActivityService;
import com.miniprogram.service.ActivitySignupService;
import com.miniprogram.service.PermissionService;
import com.miniprogram.service.SmsCodeService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 活动报名 Security：列表/详情匿名，signup / my-signup / sms 需登录。
 */
@WebMvcTest(controllers = {MpActivityController.class, MpSmsController.class})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class MpActivitySecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ActivityService activityService;
    @MockBean
    private ActivitySignupService activitySignupService;
    @MockBean
    private SmsCodeService smsCodeService;
    @MockBean
    private JwtTokenProvider jwtTokenProvider;
    @MockBean
    private AdminUserMapper adminUserMapper;
    @MockBean
    private RoleMapper roleMapper;
    @MockBean
    private PermissionService permissionService;

    @Test
    @DisplayName("GET 活动列表无需 token → 200")
    void listWithoutTokenIsOk() throws Exception {
        when(activityService.listActivities(isNull(), isNull(), eq(1), anyLong(), anyLong()))
                .thenReturn(new PageResult<>(Collections.emptyList(), 0L, 1L, 10L));

        mockMvc.perform(get("/api/v1/mp/activities"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET 活动详情无需 token → 200")
    void detailWithoutTokenIsOk() throws Exception {
        ActivityVO vo = new ActivityVO();
        vo.setId(1L);
        when(activityService.getActivityDetail(1L)).thenReturn(vo);

        mockMvc.perform(get("/api/v1/mp/activities/1"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST 报名无 token → 401")
    void signupWithoutTokenIsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/v1/mp/activities/1/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET my-signup 无 token → 401")
    void mySignupWithoutTokenIsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/mp/activities/1/my-signup"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST 短信发送无 token → 401")
    void smsSendWithoutTokenIsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/v1/mp/sms/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"13800138000\",\"scene\":\"activity_signup\"}"))
                .andExpect(status().isUnauthorized());
    }
}
