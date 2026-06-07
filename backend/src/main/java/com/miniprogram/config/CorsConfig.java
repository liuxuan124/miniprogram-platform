package com.miniprogram.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

/**
 * 跨域配置
 *
 * 安全要求(S2)：禁止通配符 "*" 与 allowCredentials(true) 共存。
 * 允许的来源通过配置项 app.cors.allowed-origins 注入（逗号分隔），
 * 生产环境由环境变量 APP_CORS_ALLOWED_ORIGINS 指定具体域名。
 */
@Configuration
public class CorsConfig {

    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    private String allowedOrigins;

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();

        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        // 使用 originPatterns 以支持端口通配（如 http://localhost:*），但不使用裸 "*"
        config.setAllowedOriginPatterns(origins);

        config.addAllowedHeader("*");
        config.addAllowedMethod("*");
        // 仅在白名单来源下允许携带凭证
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return new CorsFilter(source);
    }
}
