package com.miniprogram.support;

import com.miniprogram.common.BusinessException;

import java.util.regex.Pattern;

/**
 * 密码强度校验（S7）
 */
public final class PasswordValidator {

    private static final Pattern STRONG_PASSWORD = Pattern.compile(
            "^(?=.*[A-Za-z])(?=.*\\d).{8,32}$");

    private PasswordValidator() {
    }

    public static void validateNewPassword(String password) {
        if (password == null || password.isBlank()) {
            throw new BusinessException(110104, "新密码不能为空");
        }
        if ("admin123".equals(password) || "123456".equals(password) || "password".equals(password)) {
            throw new BusinessException(110105, "密码过于简单，请使用字母+数字且不少于8位");
        }
        if (!STRONG_PASSWORD.matcher(password).matches()) {
            throw new BusinessException(110105, "密码须8-32位且同时包含字母和数字");
        }
    }
}
