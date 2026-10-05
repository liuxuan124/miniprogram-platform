package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.file.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface FileItemService {

    PageResult<FileItemVO> listFiles(Long groupId, String keyword, String status, Long current, Long size);

    FileItemVO getFile(Long id);

    FileItemVO createFile(FileItemDTO dto);

    FileItemVO updateFile(Long id, FileItemDTO dto);

    void deleteFile(Long id);

    /** 已软删文件列表（回收站视图） */
    PageResult<FileItemVO> listDeleted(String keyword, Long current, Long size);

    /** 从回收站恢复：deleted 归零；原本是 published 的保持 published，draft 的回 draft */
    FileItemVO restoreFile(Long id);

    FileItemVO uploadAndCreate(MultipartFile file, FileItemDTO dto);

    List<FileGroupVO> listGroups();

    FileGroupVO createGroup(FileGroupDTO dto);

    FileGroupVO updateGroup(Long id, FileGroupDTO dto);

    void deleteGroup(Long id);

    /**
     * 后台编辑页「端上效果预览」：按指定可见页数渲染真实页面位图（带「试读」水印）。
     * 与小程序 preview-images 的区别：页数由表单当前配置实时决定（freePages），
     * 不要求文件已发布、不校验阅读权益 —— 给运营配置时看效果用。
     *
     * @param freePages 非会员可见页数；空则按库内 previewPercent 折算
     * @return 页位图列表；非 PDF 返回空列表（走 preview-file 流程，无位图）
     */
    List<FilePreviewImageService.Page> renderPreviewImages(Long id, Integer freePages);
}
