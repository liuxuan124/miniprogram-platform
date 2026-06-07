package com.miniprogram.config;

import com.miniprogram.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Spring Security 配置
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // 禁用 CSRF（使用 JWT 无状态认证）
                .csrf(AbstractHttpConfigurer::disable)
                // 禁用 Session
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // 请求授权配置
                .authorizeHttpRequests(auth -> auth
                        // ========== 公开接口（无需认证） ==========
                        .requestMatchers(
                                // 管理后台登录
                                "/api/v1/admin/auth/login",
                                // 小程序微信登录
                                "/api/v1/mp/auth/login",
                                // 小程序内容公开接口
                                "/api/v1/mp/contents",
                                "/api/v1/mp/contents/**",
                                // 小程序商品公开接口
                                "/api/v1/mp/products",
                                "/api/v1/mp/products/**",
                                "/api/v1/mp/product-categories",
                                // 小程序优惠券展示接口公开，领取动作仍需登录
                                "/api/v1/mp/coupons",
                                // 小程序活动公开接口
                                "/api/v1/mp/activities",
                                "/api/v1/mp/activities/**",
                                // 小程序页面 DSL 公开接口
                                "/api/v1/mp/pages",
                                "/api/v1/mp/pages/**",
                                // 小程序表单公开接口
                                "/api/v1/mp/form-templates/*",
                                // 小程序预约服务公开接口
                                "/api/v1/mp/appointment-services",
                                "/api/v1/mp/appointment-services/*/slots",
                                // 微信支付回调（公开）
                                "/api/v1/mp/payments/wx-notify",
                                "/api/v1/mp/payments/wx-refund-notify",
                                // 小程序页面访问上报（公开）
                                "/api/v1/mp/statistics/page-access",
                                // 小程序端公开配置
                                "/api/v1/mp/system/config",
                                "/api/v1/mp/config/public",
                                // 上传文件静态资源访问
                                "/uploads/**",
                                // 健康检查
                                "/api/health",
                                // Swagger / OpenAPI
                                "/doc.html",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**",
                                "/webjars/**",
                                "/favicon.ico"
                        ).permitAll()
                        // ========== 敏感模块：仅超级管理员（S1 两级 RBAC） ==========
                        // 财务中心、AI 配置(含各厂商 API Key)、退款、系统配置、用户/角色/权限管理
                        .requestMatchers(
                                "/api/v1/admin/finance/**",
                                "/api/v1/admin/agent/**",
                                "/api/v1/admin/refunds/**",
                                "/api/v1/admin/system/**",
                                "/api/v1/admin/admin-users/**",
                                "/api/v1/admin/roles/**",
                                "/api/v1/admin/permissions/**"
                        ).hasRole("super_admin")
                        // ========== 需要认证的接口 ==========
                        // 管理后台认证相关（除登录外）
                        .requestMatchers("/api/v1/admin/auth/**").authenticated()
                        // 小程序认证相关（除登录外）
                        .requestMatchers("/api/v1/mp/auth/**").authenticated()
                        // 管理后台所有接口需要认证
                        .requestMatchers("/api/v1/admin/**").authenticated()
                        // 小程序所有接口需要认证
                        .requestMatchers("/api/v1/mp/**").authenticated()
                        // 其他请求需要认证
                        .anyRequest().authenticated()
                )
                // 添加 JWT 过滤器
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }
}
