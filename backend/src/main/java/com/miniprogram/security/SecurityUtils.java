package com.miniprogram.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * 安全工具类
 * 获取当前登录用户信息
 */
public class SecurityUtils {

    private SecurityUtils() {
        // 工具类不允许实例化
    }

    /**
     * 获取当前登录用户ID
     */
    public static Long getCurrentUserId() {
        Authentication authentication = getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Long userId) {
            return userId;
        }
        return null;
    }

    /**
     * 获取当前登录用户ID，未登录则抛出异常
     */
    public static Long getRequiredCurrentUserId() {
        Long userId = getCurrentUserId();
        if (userId == null) {
            throw new com.miniprogram.common.BusinessException(
                    com.miniprogram.common.ErrorCode.TOKEN_INVALID);
        }
        return userId;
    }

    /**
     * 获取当前认证对象
     */
    public static Authentication getAuthentication() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    /**
     * 判断当前用户是否已登录
     */
    public static boolean isAuthenticated() {
        Authentication authentication = getAuthentication();
        return authentication != null
                && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof Long;
    }
}
