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

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String token = extractToken(request);

            if (StringUtils.hasText(token) && jwtTokenProvider.validateToken(token)) {
                Long userId = jwtTokenProvider.getUserIdFromToken(token);
                String username = jwtTokenProvider.getUsernameFromToken(token);

                // 构建权限列表
                List<SimpleGrantedAuthority> authorities = buildAuthorities(userId, username);

                // 构建认证对象
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userId,
                                null,
                                authorities
                        );

                SecurityContextHolder.getContext().setAuthentication(authentication);
                log.debug("JWT 认证成功: userId={}, username={}, authorities={}", userId, username, authorities);
            }
        } catch (Exception e) {
            log.error("JWT 认证处理异常: {}", e.getMessage());
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }

    /**
     * 构建用户权限列表
     * 管理后台用户：加载角色和权限点
     * 小程序用户：仅赋予基础角色
     */
    private List<SimpleGrantedAuthority> buildAuthorities(Long userId, String username) {
        List<SimpleGrantedAuthority> authorities = new ArrayList<>();

        // 判断是管理后台用户还是小程序用户
        if (username.startsWith("wx_")) {
            // 小程序用户，赋予基础角色
            authorities.add(new SimpleGrantedAuthority("ROLE_mp_user"));
        } else {
            // 管理后台用户，从数据库加载角色和权限
            AdminUser adminUser = adminUserMapper.selectById(userId);
            if (adminUser != null && adminUser.getRoleId() != null) {
                // 加载角色
                Role role = roleMapper.selectById(adminUser.getRoleId());
                if (role != null && StringUtils.hasText(role.getCode())) {
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + role.getCode()));
                }

                // 加载权限点
                List<String> permissionCodes = permissionService.getPermissionCodesByRoleId(adminUser.getRoleId());
                for (String permCode : permissionCodes) {
                    authorities.add(new SimpleGrantedAuthority(permCode));
                }
            }

            // 如果没有任何权限，赋予基础用户角色
            if (authorities.isEmpty()) {
                authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
            }
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
