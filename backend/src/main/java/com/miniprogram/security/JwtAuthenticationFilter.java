package com.miniprogram.security;

import com.miniprogram.entity.AdminUser;
import com.miniprogram.entity.Role;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.AdminUserMapper;
import com.miniprogram.mapper.RoleMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.service.PermissionService;
import com.miniprogram.tenant.TenantContext;
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
    private final UserMapper userMapper;

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";
    private static final String TENANT_HEADER = "X-Tenant-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            resolveTenant(request);
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

                List<SimpleGrantedAuthority> authorities = buildAuthorities(userId, username, response);
                if (authorities == null) {
                    return;
                }

                bindTenantForUser(userId, username, request);

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userId,
                                null,
                                authorities
                        );
                authentication.setDetails(username);

                SecurityContextHolder.getContext().setAuthentication(authentication);
                log.debug("JWT 认证成功: userId={}, tenantId={}, username={}", userId, TenantContext.getTenantId(), username);
            }
        } catch (Exception e) {
            log.error("JWT 认证处理异常: {}", e.getMessage());
            SecurityContextHolder.clearContext();
            TenantContext.clear();
            SecurityErrorWriter.write(response, 401, 110101, "未登录");
            return;
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    /** 匿名请求：Header 优先，否则默认租户 */
    private void resolveTenant(HttpServletRequest request) {
        String header = request.getHeader(TENANT_HEADER);
        if (StringUtils.hasText(header)) {
            try {
                TenantContext.setTenantId(Long.parseLong(header.trim()));
                return;
            } catch (NumberFormatException ignored) {
                // fallthrough
            }
        }
        TenantContext.setTenantId(TenantContext.DEFAULT_TENANT_ID);
    }

    private void bindTenantForUser(Long userId, String username, HttpServletRequest request) {
        if (username != null && username.startsWith("wx_")) {
            User user = userMapper.selectById(userId);
            if (user != null && user.getTenantId() != null) {
                TenantContext.setTenantId(user.getTenantId());
            }
            return;
        }
        AdminUser adminUser = adminUserMapper.selectById(userId);
        if (adminUser != null && adminUser.getTenantId() != null) {
            TenantContext.setTenantId(adminUser.getTenantId());
        }
        // 仅超管可用 X-Tenant-Id 切换租户上下文
        String header = request.getHeader(TENANT_HEADER);
        if (!StringUtils.hasText(header) || adminUser == null) {
            return;
        }
        if (!isSuperAdmin(adminUser)) {
            return;
        }
        try {
            TenantContext.setTenantId(Long.parseLong(header.trim()));
        } catch (NumberFormatException ignored) {
            // keep admin tenant
        }
    }

    private boolean isSuperAdmin(AdminUser adminUser) {
        if (adminUser.getRoleId() == null) {
            return false;
        }
        Role role = roleMapper.selectById(adminUser.getRoleId());
        return role != null && "super_admin".equals(role.getCode());
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
