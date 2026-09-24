package com.miniprogram.service.impl;

import com.miniprogram.dto.ContentDTO;
import com.miniprogram.dto.ContentDetailDTO;
import com.miniprogram.entity.Content;
import com.miniprogram.mapper.ContentMapper;
import com.miniprogram.service.ContentService;
import com.miniprogram.service.XiaohongshuImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class XiaohongshuImportServiceImpl implements XiaohongshuImportService {

    private static final Pattern TITLE = Pattern.compile("「([^」]+)」");

    private final ContentService contentService;
    private final ContentMapper contentMapper;

    @Override
    public ContentDetailDTO importFromPaste(Long userId, String pasteText, String originalUrl, List<String> imageUrls) {
        ContentDTO dto = new ContentDTO();
        dto.setContentType("note");
        dto.setTitle(extractTitle(pasteText));
        dto.setSummary(trimSummary(pasteText));
        dto.setSource("xiaohongshu");
        dto.setVisibility("public");
        dto.setImages(imageUrls);
        if (imageUrls != null && !imageUrls.isEmpty()) {
            dto.setCoverImage(imageUrls.get(0));
        }
        ContentDetailDTO created = contentService.createContent(dto);
        if (created != null && created.getId() != null) {
            Content patch = new Content();
            patch.setId(created.getId());
            patch.setSourceTag("xiaohongshu");
            if (StringUtils.hasText(originalUrl)) {
                patch.setOriginalUrl(originalUrl.trim());
            }
            contentMapper.updateById(patch);
        }
        return created;
    }

    private String extractTitle(String text) {
        if (!StringUtils.hasText(text)) return "小红书笔记";
        Matcher m = TITLE.matcher(text);
        if (m.find()) return m.group(1).trim();
        String line = text.lines().filter(StringUtils::hasText).findFirst().orElse("小红书笔记");
        return line.length() > 40 ? line.substring(0, 40) : line;
    }

    private String trimSummary(String text) {
        if (!StringUtils.hasText(text)) return "";
        String s = text.trim();
        return s.length() > 200 ? s.substring(0, 200) : s;
    }
}
