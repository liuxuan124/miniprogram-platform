package com.miniprogram.service;

import com.miniprogram.dto.system.UploadResultVO;
import org.springframework.web.multipart.MultipartFile;

/**
 * 文件上传 Service
 */
public interface FileUploadService {

    /**
     * 上传文件
     *
     * @param file 文件
     * @return 上传结果
     */
    UploadResultVO upload(MultipartFile file);

    /**
     * 上传文件（指定子目录）
     *
     * @param file   文件
     * @param subDir 子目录
     * @return 上传结果
     */
    UploadResultVO upload(MultipartFile file, String subDir);
}
