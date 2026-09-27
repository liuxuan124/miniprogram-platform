package com.miniprogram.security;

import com.miniprogram.common.BusinessException;
import com.miniprogram.service.ContentPreviewTokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * 解析小程序草稿预览 JWT，供 view=draft 接口使用；正式版请求可不带令牌。
 */
@Component
@RequiredArgsConstructor
public class MpContentPreviewFilter extends OncePerRequestFilter {

    public static final String HEADER_PREVIEW = "X-Mp-Preview-Token";

    private final ContentPreviewTokenService contentPreviewTokenService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri == null || !uri.startsWith("/api/v1/mp/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String token = request.getHeader(HEADER_PREVIEW);
            if (!StringUtils.hasText(token)) {
                token = request.getParameter("pt");
            }
            if (StringUtils.hasText(token)) {
                try {
                    ContentPreviewTokenProvider.ParsedPreview parsed =
                            contentPreviewTokenService.validateAndParse(token);
                    ContentPreviewContextHolder.set(ContentPreviewContext.builder()
                            .tenantId(parsed.tenantId())
                            .operatorId(parsed.operatorId())
                            .scope(parsed.scope())
                            .jti(parsed.jti())
                            .build());
                } catch (BusinessException ignored) {
                    // 无效/过期 pt：online 请求照常；draft 由 Controller 拒绝
                }
            }
            filterChain.doFilter(request, response);
        } finally {
            ContentPreviewContextHolder.clear();
        }
    }
}
