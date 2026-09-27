package com.miniprogram.util;

import com.miniprogram.common.BusinessException;
import com.miniprogram.security.ContentPreviewContextHolder;
import org.springframework.util.StringUtils;

public final class MpContentViewHelper {

    private MpContentViewHelper() {
    }

    public static String normalizeView(String view) {
        if (!StringUtils.hasText(view) || "online".equalsIgnoreCase(view) || "live".equalsIgnoreCase(view)) {
            return "online";
        }
        if ("draft".equalsIgnoreCase(view)) {
            return "draft";
        }
        throw new BusinessException(400, "view 仅支持 online 或 draft");
    }

    public static void requireDraftAccess(String view) {
        if ("draft".equals(view) && !ContentPreviewContextHolder.hasDraftAccess()) {
            throw new BusinessException(403, "查看草稿需要有效预览令牌（体验版启动参数 pt 或请求头）");
        }
    }
}
