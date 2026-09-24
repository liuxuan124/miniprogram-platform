package com.miniprogram.service;

import com.miniprogram.dto.ContentDTO;
import com.miniprogram.dto.ContentDetailDTO;

public interface XiaohongshuImportService {
    ContentDetailDTO importFromPaste(Long userId, String pasteText, String originalUrl, java.util.List<String> imageUrls);
}
