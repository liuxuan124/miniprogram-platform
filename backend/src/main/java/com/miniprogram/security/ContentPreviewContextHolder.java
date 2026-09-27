package com.miniprogram.security;

/**
 * 请求线程内草稿预览上下文。
 */
public final class ContentPreviewContextHolder {

    private static final ThreadLocal<ContentPreviewContext> CTX = new ThreadLocal<>();

    private ContentPreviewContextHolder() {
    }

    public static void set(ContentPreviewContext ctx) {
        CTX.set(ctx);
    }

    public static ContentPreviewContext get() {
        return CTX.get();
    }

    public static boolean hasDraftAccess() {
        ContentPreviewContext ctx = CTX.get();
        return ctx != null && "draft:read".equals(ctx.getScope());
    }

    public static void clear() {
        CTX.remove();
    }
}
