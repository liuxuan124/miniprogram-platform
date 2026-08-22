package com.miniprogram.service;

import com.miniprogram.dto.ContentAttachmentDTO;
import com.miniprogram.dto.file.FileAccessVO;
import com.miniprogram.entity.FileItem;

import java.nio.file.Path;
import java.util.List;

public interface FileEntitlementService {

    FileAccessVO buildAccessVO(FileItem item, Long userId);

    FileAccessVO getAccess(Long fileId, Long userId);

    Path resolveFilePath(FileItem item);

    boolean canRead(FileItem item, Long userId);

    boolean canDownload(FileItem item, Long userId);

    String extractPreviewText(FileItem item, int previewPercent);

    List<ContentAttachmentDTO> enrichAttachments(List<ContentAttachmentDTO> attachments, Long userId);
}
