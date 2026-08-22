package com.miniprogram.service.wechat;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WeChatArticlePageParserTest {

    private final WeChatArticlePageParser parser = new WeChatArticlePageParser();

    @Test
    void normalizeUrlExtractsWechatArticleLink() {
        String url = parser.normalizeUrl("请看 https://mp.weixin.qq.com/s/abc-123_456 谢谢");
        assertEquals("https://mp.weixin.qq.com/s/abc-123_456", url);
    }

    @Test
    void extractSlugFromUrl() {
        assertEquals("6hytke48TCsE8NJk_DQyTQ", parser.extractSlug("https://mp.weixin.qq.com/s/6hytke48TCsE8NJk_DQyTQ"));
    }

    @Test
    void extractJsContentWithNestedDivs() {
        String html = """
                <html><body>
                <div id="js_content">
                  <section><p>段落一</p></section>
                  <div><p>段落二</p></div>
                </div><script>var ct = "1716220800";</script>
                </body></html>
                """;
        var method = org.springframework.test.util.ReflectionTestUtils.invokeMethod(parser, "extractJsContent", html);
        String content = String.valueOf(method);
        assertTrue(content.contains("段落一"));
        assertTrue(content.contains("段落二"));
        assertFalse(content.contains("<script"));
    }
}
