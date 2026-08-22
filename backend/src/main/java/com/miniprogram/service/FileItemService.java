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

    FileItemVO uploadAndCreate(MultipartFile file, FileItemDTO dto);

    List<FileGroupVO> listGroups();

    FileGroupVO createGroup(FileGroupDTO dto);

    FileGroupVO updateGroup(Long id, FileGroupDTO dto);

    void deleteGroup(Long id);
}
