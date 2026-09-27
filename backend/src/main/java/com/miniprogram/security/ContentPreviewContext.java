package com.miniprogram.security;

import lombok.Builder;
import lombok.Value;

/**
 * 小程序端「草稿预览」鉴权上下文（与 C 端用户 JWT 分离）。
 */
@Value
@Builder
public class ContentPreviewContext {
    Long tenantId;
    Long operatorId;
    String scope;
    String jti;
}
