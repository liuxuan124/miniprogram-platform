package com.miniprogram.service.miniapp;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class StoreTemplateNamesTest {

    @Test
    void displayPrefersNameOverSemver() {
        assertEquals("春日版式", StoreTemplateNames.display("春日版式", "1.2.0", "内部备注"));
        assertEquals("内部备注", StoreTemplateNames.display("  ", "1.2.0", "内部备注"));
        assertEquals("版式 1.2.0", StoreTemplateNames.display(null, "1.2.0", null));
        assertEquals("未命名模板", StoreTemplateNames.display(null, null, null));
    }

    @Test
    void duplicateKeepsShortChinese() {
        assertEquals("春日版式 副本", StoreTemplateNames.duplicateOf("春日版式"));
        assertEquals("模板 副本", StoreTemplateNames.duplicateOf("  "));
    }

    @Test
    void normalizeTrimsAndCaps() {
        assertEquals("暖阁首页", StoreTemplateNames.normalize("  暖阁首页  "));
        assertEquals(32, StoreTemplateNames.normalize("一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十超长").length());
    }
}
