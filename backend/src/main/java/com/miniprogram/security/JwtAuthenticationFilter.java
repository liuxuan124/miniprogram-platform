package com.miniprogram.security;

import com.miniprogram.entity.AdminUser;
import com.miniprogram.entity.Role;
import com.miniprogram.mapper.AdminUserMapper;
import com.miniprogram.mapper.RoleMapper;
import com.miniprogram.service.PermissionService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * JWT 认证过滤器
 * 从请求头中提取 Token，验证并设置 Spring Security 上下文
 * 增强版：从数据库加载用户角色和权限，支持 RBAC
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final AdminUserMapper adminUserMapper;
    private final RoleMapper roleMapper;
    private final PermissionService permissionService;
    private final JwtBlacklistService jwtBlacklistService;

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String token = extractToken(request);

            if (StringUtils.hasText(token)) {
                JwtTokenProvider.TokenStatus status = jwtTokenProvider.inspectToken(token, JwtTokenProvider.TYP_ACCESS);
                if (status == JwtTokenProvider.TokenStatus.EXPIRED) {
                    SecurityErrorWriter.write(response, 401, 110102, "Token已过期");
                    return;
                }
                if (status != JwtTokenProvider.TokenStatus.VALID) {
                    SecurityErrorWriter.write(response, 401, 110101, "未登录");
                    return;
                }
                if (jwtBlacklistService.isBlacklisted(token)) {
                    SecurityErrorWriter.write(response, 401, 110103, "Token已失效，请重新登录");
                    return;
                }

                Long userId = jwtTokenProvider.getUserIdFromToken(token);
                String username = jwtTokenProvider.getUsernameFromToken(token);

                long issuedAt = jwtTokenProvider.getIssuedAtEpochSeconds(token);
                if (jwtBlacklistService.isRevokedForUser(userId, issuedAt)) {
                    SecurityErrorWriter.write(response, 401, 110103, "Token已失效，请重新登录");
                    return;
                }

                // 构建权限列表（管理端会校验账号 status）
                List<SimpleGrantedAuthority> authorities = buildAuthorities(userId, username, response);
                if (authorities == null) {
                    return;
                }

                // 构建认证对象
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userId,
                                null,
                                authorities
                        );
                authentication.setDetails(username);

                SecurityContextHolder.getContext().setAuthentication(authentication);
                log.debug("JWT 认证成功: userId={}, username={}, authorities={}", userId, username, authorities);
            }
        } catch (Exception e) {
            log.error("JWT 认证处理异常: {}", e.getMessage());
            SecurityContextHolder.clearContext();
            SecurityErrorWriter.write(response, 401, 110101, "未登录");
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * @return null 表示已写 401 响应，调用方应直接 return
     */
    private List<SimpleGrantedAuthority> buildAuthorities(Long userId, String username,
                                                          HttpServletResponse response) throws IOException {
        List<SimpleGrantedAuthority> authorities = new ArrayList<>();

        if (username.startsWith("wx_")) {
            authorities.add(new SimpleGrantedAuthority("ROLE_mp_user"));
            return authorities;
        }

        AdminUser adminUser = adminUserMapper.selectById(userId);
        if (adminUser == null) {
            SecurityErrorWriter.write(response, 401, 110101, "未登录");
            return null;
        }
        if (adminUser.getStatus() == null || adminUser.getStatus() == 0) {
            SecurityErrorWriter.write(response, 401, 110104, "账号已禁用");
            return null;
        }

        if (adminUser.getRoleId() != null) {
            Role role = roleMapper.selectById(adminUser.getRoleId());
            if (role != null && StringUtils.hasText(role.getCode())) {
                authorities.add(new SimpleGrantedAuthority("ROLE_" + role.getCode()));
            }
            List<String> permissionCodes = permissionService.getPermissionCodesByRoleId(adminUser.getRoleId());
            for (String permCode : permissionCodes) {
                authorities.add(new SimpleGrantedAuthority(permCode));
            }
        }

        if (authorities.isEmpty()) {
            authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
        }
        return authorities;
    }

    /**
     * 从请求头中提取 Token
     */
    private String extractToken(HttpServletRequest request) {
        String bearerToken = request.getHeader(AUTHORIZATION_HEADER);
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith(BEARER_PREFIX)) {
            return bearerToken.substring(BEARER_PREFIX.length());
        }
        return null;
    }
}
