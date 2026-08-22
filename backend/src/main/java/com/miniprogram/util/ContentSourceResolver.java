package com.miniprogram.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.entity.Content;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.List;
import java.util.Set;

/**
 * 将内容记录解析为平台来源（微信公众号 / 小红书 / 原创等），
 * 避免历史数据把栏目名误写入 source 字段。
 */
public final class ContentSourceResolver {

    private static final Set<String> PLATFORM_SOURCES = Set.of(
            "微信公众号", "小红书", "笔记", "动态", "原创", "手动录入", "本地联调");

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private ContentSourceResolver() {
    }

    public static String resolvePlatformSource(Content entity) {
        if (entity == null) {
            return "未标注";
        }
        String source = trim(entity.getSource());
        List<String> tags = parseTags(entity.getTags());
        String external = trim(entity.getExternalSource());

        if (PLATFORM_SOURCES.contains(source)) {
            return source;
        }
        if (isWechatExternal(external) || hasWechatSyncTags(tags)) {
            return "微信公众号";
        }
        if ("小红书".equals(source) || tags.contains("小红书")) {
            return "小红书";
        }
        if (StringUtils.hasText(source)) {
            return "原创";
        }
        return "未标注";
    }

    private static boolean isWechatExternal(String external) {
        return StringUtils.hasText(external) && external.startsWith("wechat");
    }

    private static boolean hasWechatSyncTags(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return false;
        }
        for (String tag : tags) {
            if (!StringUtils.hasText(tag)) {
                continue;
            }
            if ("微信公众号".equals(tag) || tag.startsWith("wx-type:") || tag.startsWith("wx:")
                    || tag.startsWith("wx-batch:")) {
                return true;
            }
        }
        return false;
    }

    private static List<String> parseTags(String json) {
        if (!StringUtils.hasText(json)) {
            return Collections.emptyList();
        }
        try {
            return MAPPER.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private static String trim(String value) {
        return value != null ? value.trim() : "";
    }
}
