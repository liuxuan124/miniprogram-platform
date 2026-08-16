package com.miniprogram.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 接口限流：按 IP 滑动窗口，默认 50 次/分钟，突发请求返回 429 / 100201
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int BURST_LIMIT = 40;
    private static final long BURST_WINDOW_MS = 2_000L;
    private static final int MINUTE_LIMIT = 100;
    private static final long MINUTE_WINDOW_MS = 60_000L;

    private final Map<String, Deque<Long>> windows = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return "OPTIONS".equalsIgnoreCase(request.getMethod())
                || path.startsWith("/uploads/")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs")
                || path.startsWith("/webjars/")
                || path.equals("/doc.html")
                || path.equals("/favicon.ico")
                || path.equals("/api/health")
                || path.equals("/api/v1/mp/payments/wx-notify")
                || path.equals("/api/v1/mp/payments/wx-refund-notify");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String ip = resolveClientIp(request);
        long now = System.currentTimeMillis();
        Deque<Long> hits = windows.computeIfAbsent(ip, key -> new ArrayDeque<>());
        synchronized (hits) {
            while (!hits.isEmpty() && now - hits.peekFirst() >= MINUTE_WINDOW_MS) {
                hits.pollFirst();
            }
            long burstCount = hits.stream().filter(ts -> now - ts < BURST_WINDOW_MS).count();
            if (burstCount >= BURST_LIMIT || hits.size() >= MINUTE_LIMIT) {
                SecurityErrorWriter.write(response, 429, 100201, "请求过于频繁");
                return;
            }
            hits.addLast(now);
        }
        filterChain.doFilter(request, response);
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr() == null ? "unknown" : request.getRemoteAddr();
    }
}
