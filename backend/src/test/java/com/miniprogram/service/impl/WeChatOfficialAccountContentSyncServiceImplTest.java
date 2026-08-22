package com.miniprogram.service.impl;

import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertFalse;

class WeChatOfficialAccountContentSyncServiceImplTest {

    @Test
    void richTextArticleWithShortDigestIsNotNewspic() throws Exception {
        WeChatOfficialAccountContentSyncServiceImpl service =
                new WeChatOfficialAccountContentSyncServiceImpl(null, null, null, null, null, null);
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
}
