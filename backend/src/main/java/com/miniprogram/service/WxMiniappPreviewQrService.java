package com.miniprogram.service;

/**
 * 微信体验版小程序码（scene 携带预览 jti，最长 32 字符）。
 */
public interface WxMiniappPreviewQrService {

    /**
     * @param scene 通常 preview jti
     * @param page  如 pages/index/index
     * @return PNG 字节；微信未配置或接口失败时返回 null
     */
    byte[] createUnlimitedQrPng(String scene, String page);
}
