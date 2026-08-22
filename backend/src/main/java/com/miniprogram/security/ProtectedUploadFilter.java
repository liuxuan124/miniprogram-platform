package com.miniprogram.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.UriUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * 阻止 protected 子目录通过 /uploads/** 静态映射被直接访问（含 URL 编码绕过）
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class ProtectedUploadFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String uri = request.getRequestURI();
        if (isProtectedUpload(uri)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"code\":403001,\"message\":\"禁止直接访问受保护文件\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }

    static boolean isProtectedUpload(String uri) {
        if (uri == null || uri.isEmpty()) return false;
        String decoded = uri;
        // 多次解码，防止 %252F 等二次编码绕过
        for (int i = 0; i < 3; i++) {
            String next = UriUtils.decode(decoded, StandardCharsets.UTF_8);
            if (next.equals(decoded)) break;
            decoded = next;
        }
        String normalized = decoded.replace('\\', '/').toLowerCase(Locale.ROOT);
        while (normalized.contains("//")) {
            normalized = normalized.replace("//", "/");
        }
        return normalized.contains("/uploads/protected/")
                || normalized.matches(".*/uploads/[^/]*protected[^/]*/.*");
    }
}
