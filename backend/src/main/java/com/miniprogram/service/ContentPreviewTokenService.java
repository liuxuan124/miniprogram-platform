package com.miniprogram.service;

import com.miniprogram.dto.mini.ContentPreviewTokenCreateVO;
import com.miniprogram.security.ContentPreviewTokenProvider;

public interface ContentPreviewTokenService {

    ContentPreviewTokenCreateVO createForCurrentOperator(boolean withWxQr);

    void revokeByJti(String jti);

    /** 小程序扫码 scene → JWT（仅 Redis 索引，2h） */
    String exchangeByJti(String jti);

    ContentPreviewTokenProvider.ParsedPreview validateAndParse(String token);
}
