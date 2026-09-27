package com.miniprogram.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 为 true 时：管理端改站点/页面后自动推到小程序可读配置，无需单独点「发布与分发」。
 * 微信代码包仍须本地上传；此处仅内容配置（导航、DSL、主题等）。
 */
@Data
@Component
@ConfigurationProperties(prefix = "app.content")
public class ContentMiniappAutoSyncProperties {

    /** 默认 false，本地 Docker 可通过 APP_CONTENT_AUTO_SYNC=true 开启 */
    private boolean autoSyncToMiniapp = false;

    public boolean isAutoSyncToMiniapp() {
        return autoSyncToMiniapp;
    }
}
