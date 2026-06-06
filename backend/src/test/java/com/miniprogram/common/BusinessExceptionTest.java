package com.miniprogram.common;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 业务异常测试
 */
class BusinessExceptionTest {

    @Test
    @DisplayName("业务异常 - 使用ErrorCode构造")
    void should_createException_when_withErrorCode() {
        BusinessException ex = new BusinessException(ErrorCode.ADMIN_NOT_FOUND);
        assertEquals(ErrorCode.ADMIN_NOT_FOUND.getCode(), ex.getCode());
        assertEquals(ErrorCode.ADMIN_NOT_FOUND.getMessage(), ex.getMessage());
    }

    @Test
    @DisplayName("业务异常 - 使用ErrorCode和自定义消息构造")
    void should_createException_when_withErrorCodeAndMessage() {
        String customMsg = "自定义错误消息";
        BusinessException ex = new BusinessException(ErrorCode.ADMIN_NOT_FOUND, customMsg);
        assertEquals(ErrorCode.ADMIN_NOT_FOUND.getCode(), ex.getCode());
        assertEquals(customMsg, ex.getMessage());
    }

    @Test
    @DisplayName("业务异常 - 是RuntimeException的子类")
    void should_beRuntimeException_when_created() {
        BusinessException ex = new BusinessException(ErrorCode.PARAM_ERROR);
        assertInstanceOf(RuntimeException.class, ex);
    }

    @Test
    @DisplayName("业务异常 - 可以被catch捕获")
    void should_beCatchable_when_thrown() {
        assertThrows(BusinessException.class, () -> {
            throw new BusinessException(ErrorCode.DATA_SAVE_FAILED);
        });
    }
}
