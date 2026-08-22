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
 * 接口限流：按 IP 滑动窗口；事件上报更严；支付回调宽松但存在。
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int BURST_LIMIT = 40;
    private static final long BURST_WINDOW_MS = 2_000L;
    private static final int MINUTE_LIMIT = 100;
    private static final long MINUTE_WINDOW_MS = 60_000L;
    private static final int EVENT_MINUTE_LIMIT = 30;
    private static final int PAY_NOTIFY_MINUTE_LIMIT = 300;
    private static final int PAY_NOTIFY_BURST = 60;

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
                || path.equals("/api/health");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String ip = resolveClientIp(request);
        String path = request.getRequestURI();
        boolean eventPath = path != null && (path.equals("/api/v1/mp/events") || path.equals("/api/v1/mp/events/batch"));
        boolean payNotify = path != null && (path.equals("/api/v1/mp/payments/wx-notify")
                || path.equals("/api/v1/mp/payments/wx-refund-notify"));

        String bucketKey;
        int minuteLimit;
        int burstLimit;
        if (payNotify) {
            bucketKey = "pay:" + ip;
            minuteLimit = PAY_NOTIFY_MINUTE_LIMIT;
            burstLimit = PAY_NOTIFY_BURST;
        } else if (eventPath) {
            bucketKey = "evt:" + ip;
            minuteLimit = EVENT_MINUTE_LIMIT;
            burstLimit = 10;
        } else {
            bucketKey = ip;
            minuteLimit = MINUTE_LIMIT;
            burstLimit = BURST_LIMIT;
        }

        long now = System.currentTimeMillis();
        Deque<Long> hits = windows.computeIfAbsent(bucketKey, key -> new ArrayDeque<>());
        synchronized (hits) {
            while (!hits.isEmpty() && now - hits.peekFirst() >= MINUTE_WINDOW_MS) {
                hits.pollFirst();
            }
            long burstCount = hits.stream().filter(ts -> now - ts < BURST_WINDOW_MS).count();
            if (burstCount >= burstLimit || hits.size() >= minuteLimit) {
                SecurityErrorWriter.write(response, 429, 100201, "请求过于频繁");
                return;
            }
            hits.addLast(now);
        }
        if (windows.size() > 10_000) {
            windows.entrySet().removeIf(e -> {
                Deque<Long> d = e.getValue();
                synchronized (d) {
                    return d.isEmpty() || now - d.peekLast() > MINUTE_WINDOW_MS;
                }
            });
        }
        filterChain.doFilter(request, response);
    }

    private String resolveClientIp(HttpServletRequest request) {
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr() == null ? "unknown" : request.getRemoteAddr();
    }
}
