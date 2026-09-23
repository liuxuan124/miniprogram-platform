package com.miniprogram.service;

import com.miniprogram.dto.ContentAttachmentDTO;
import com.miniprogram.dto.file.FileAccessVO;
import com.miniprogram.entity.FileItem;

import java.nio.file.Path;
import java.util.List;

public interface FileEntitlementService {

    FileAccessVO buildAccessVO(FileItem item, Long userId);

    /** @param planetId 资料归属/请求上下文星球；{@code planet_member} 门禁需要明确值 */
    FileAccessVO buildAccessVO(FileItem item, Long userId, String planetId);

    /** 列表降级：物理文件缺失时不中断整页 */
    FileAccessVO buildAccessVOWithoutPreview(FileItem item, Long userId, String planetId, String unavailableHint);

    FileAccessVO getAccess(Long fileId, Long userId);

    FileAccessVO getAccess(Long fileId, Long userId, String planetId);

    Path resolveFilePath(FileItem item);

    boolean canRead(FileItem item, Long userId);

    boolean canRead(FileItem item, Long userId, String planetId);

    boolean canDownload(FileItem item, Long userId);

    boolean canDownload(FileItem item, Long userId, String planetId);

    boolean canPreview(FileItem item, Long userId);

    boolean canPreview(FileItem item, Long userId, String planetId);

    String extractPreviewText(FileItem item, int previewPercent);

    List<ContentAttachmentDTO> enrichAttachments(List<ContentAttachmentDTO> attachments, Long userId);

    List<ContentAttachmentDTO> enrichAttachments(List<ContentAttachmentDTO> attachments, Long userId, String planetId);

    int resolveKeepPages(FileItem item);
}
