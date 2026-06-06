package com.miniprogram.common;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 错误码枚举测试
 */
class ErrorCodeTest {

    @Test
    @DisplayName("错误码格式 - 全部为正整数")
    void should_bePositive_when_allErrorCodes() {
        for (ErrorCode code : ErrorCode.values()) {
            assertTrue(code.getCode() > 0, code.name() + " 的编码必须为正整数");
        }
    }

    @Test
    @DisplayName("错误码唯一 - 无重复编码")
    void should_beUnique_when_allErrorCodes() {
        Set<Integer> codes = new HashSet<>();
        for (ErrorCode code : ErrorCode.values()) {
            assertFalse(codes.contains(code.getCode()),
                    code.name() + " 的编码 " + code.getCode() + " 与其他错误码重复");
            codes.add(code.getCode());
        }
    }

    @Test
    @DisplayName("错误码消息 - 不为空")
    void should_haveMessage_when_allErrorCodes() {
        for (ErrorCode code : ErrorCode.values()) {
            assertNotNull(code.getMessage(), code.name() + " 的消息为null");
            assertFalse(code.getMessage().isEmpty(), code.name() + " 的消息为空字符串");
        }
    }
}
