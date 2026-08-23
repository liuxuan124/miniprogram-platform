package com.miniprogram.service.impl;

import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WeChatOfficialAccountContentSyncServiceImplTest {

    private WeChatOfficialAccountContentSyncServiceImpl newService() throws Exception {
        Constructor<?> ctor = WeChatOfficialAccountContentSyncServiceImpl.class.getDeclaredConstructors()[0];
        Object[] args = new Object[ctor.getParameterCount()];
        return (WeChatOfficialAccountContentSyncServiceImpl) ctor.newInstance(args);
    }

    @Test
    void richTextArticleWithShortDigestIsNotNewspic() throws Exception {
        WeChatOfficialAccountContentSyncServiceImpl service = newService();
        JSONObject item = new JSONObject()
                .set("title", "跨境电商财税税种详细解读")
                .set("digest", "一篇简短摘要")
                .set("thumb_url", "https://example.com/cover.jpg")
                .set("content", """
                        <section data-tools="135编辑器">
                          <section><h2>跨境电商税务解析</h2></section>
                          <p>这是公众号富文本文章正文。</p>
                          <img src="https://example.com/body.jpg"/>
                        </section>
                        """);

        Method method = WeChatOfficialAccountContentSyncServiceImpl.class
                .getDeclaredMethod("isNewspic", JSONObject.class);
        method.setAccessible(true);

        assertFalse((Boolean) method.invoke(service, item));
    }

    @Test
    void rewriteHtmlImagesNormalizesDataSrcToSrc() throws Exception {
        WeChatOfficialAccountContentSyncServiceImpl service = newService();
        Method method = WeChatOfficialAccountContentSyncServiceImpl.class
                .getDeclaredMethod("rewriteHtmlImages", String.class, java.util.Map.class, String.class);
        method.setAccessible(true);
        String html = "<p><img data-src=\"https://mmbiz.qpic.cn/test.jpg\" class=\"rich_pages\"></p>";
        String out = (String) method.invoke(service, html, new java.util.LinkedHashMap<>(), "wechat-oa");
        assertTrue(out.contains("src=\"https://mmbiz.qpic.cn/test.jpg\""));
        assertFalse(out.toLowerCase().contains("data-src"));
    }

    @Test
    void imgPatternCapturesUrlFromDataSrc() throws Exception {
        var field = WeChatOfficialAccountContentSyncServiceImpl.class.getDeclaredField("IMG_SRC_PATTERN");
        field.setAccessible(true);
        Pattern pattern = (Pattern) field.get(null);
        var matcher = pattern.matcher("<img data-src=\"https://example.com/a.png\">");
        assertTrue(matcher.find());
        assertTrue(matcher.group(3).contains("example.com/a.png"));
    }
}
