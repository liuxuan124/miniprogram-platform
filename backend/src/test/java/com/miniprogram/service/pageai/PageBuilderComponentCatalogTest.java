package com.miniprogram.service.pageai;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PageBuilderComponentCatalogTest {

    @Test
    void catalogCoversEditorComponentTypes() throws IOException {
        String pageTs = Files.readString(find("admin/src/types/page.ts"), StandardCharsets.UTF_8);
        int start = pageTs.indexOf("export enum ComponentType");
        int end = pageTs.indexOf('}', start);
        assertTrue(start >= 0 && end > start);
        Matcher m = Pattern.compile("=\\s*'([a-z0-9_]+)'").matcher(pageTs.substring(start, end));
        Set<String> editorTypes = new LinkedHashSet<>();
        while (m.find()) {
            editorTypes.add(m.group(1));
        }
        assertFalse(editorTypes.isEmpty());

        Set<String> catalog = PageBuilderComponentCatalog.types();
        Set<String> missing = new LinkedHashSet<>(editorTypes);
        missing.removeAll(catalog);
        Set<String> extra = new LinkedHashSet<>(catalog);
        extra.removeAll(editorTypes);
        assertTrue(missing.isEmpty(), "目录缺少装修器组件: " + missing);
        assertTrue(extra.isEmpty(), "目录多出未知组件: " + extra);
    }

    private static Path find(String relative) {
        Path cwd = Path.of("").toAbsolutePath();
        Path[] candidates = {
                cwd.resolve(relative),
                cwd.resolve("../" + relative),
                cwd.getParent() == null ? cwd.resolve(relative) : cwd.getParent().resolve(relative)
        };
        for (Path p : candidates) {
            if (Files.exists(p)) {
                return p;
            }
        }
        throw new IllegalStateException("找不到 " + relative + "，cwd=" + cwd);
    }
}
