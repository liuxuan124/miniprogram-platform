package com.miniprogram.service.impl;

import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.dto.system.UploadResultVO;
import com.miniprogram.service.FileUploadService;
import com.miniprogram.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Set;
import java.util.UUID;

/**
 * 文件上传 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FileUploadServiceImpl implements FileUploadService {

    private final SystemConfigService systemConfigService;

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    @Value("${file.base-url:http://localhost:8080}")
    private String baseUrl;

    /**
     * 允许的文件扩展名
     */
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "gif", "bmp", "webp",
            "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
            "zip", "rar", "mp4", "mp3",
            "p12", "pem", "cer", "crt", "key"
    );

    /**
     * 默认最大文件大小 10MB
     */
    private static final long DEFAULT_MAX_SIZE = 10 * 1024 * 1024;

    @Override
    public UploadResultVO upload(MultipartFile file) {
        return upload(file, null);
    }

    @Override
    public UploadResultVO upload(MultipartFile file, String subDir) {
        // 校验文件
        validateFile(file);

        // 生成存储路径: {subDir}/{yyyy-MM-dd}/{uuid}.{ext}
        String originalFileName = file.getOriginalFilename();
        String ext = getExtension(originalFileName);
        String datePath = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        String fileName = UUID.randomUUID().toString().replace("-", "") + "." + ext;

        String relativePath;
        if (StringUtils.hasText(subDir)) {
            relativePath = subDir + "/" + datePath + "/" + fileName;
        } else {
            relativePath = datePath + "/" + fileName;
        }

        // 保存文件到本地
        try {
            Path filePath = Paths.get(uploadDir, relativePath);
            Files.createDirectories(filePath.getParent());
            Files.copy(file.getInputStream(), filePath);
            log.info("文件上传成功: {}", filePath);
        } catch (IOException e) {
            log.error("文件上传失败: {}", e.getMessage(), e);
            throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
        }

        // 构建返回结果
        UploadResultVO result = new UploadResultVO();
        result.setFileName(fileName);
        result.setOriginalFileName(originalFileName);
        result.setUrl(baseUrl + "/uploads/" + relativePath);
        result.setFileSize(file.getSize());
        result.setContentType(file.getContentType());
        return result;
    }

    /**
     * 校验文件
     */
    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
        }

        // 校验文件大小
        String maxSizeStr = systemConfigService.getConfigValue("upload_max_size", String.valueOf(DEFAULT_MAX_SIZE));
        long maxSize;
        try {
            maxSize = Long.parseLong(maxSizeStr);
        } catch (NumberFormatException e) {
            maxSize = DEFAULT_MAX_SIZE;
        }
        if (file.getSize() > maxSize) {
            throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
        }

        // 校验文件类型
        String ext = getExtension(file.getOriginalFilename());
        if (!StringUtils.hasText(ext) || !ALLOWED_EXTENSIONS.contains(ext.toLowerCase())) {
            throw new BusinessException(ErrorCode.FILE_TYPE_NOT_ALLOWED);
        }
    }

    /**
     * 获取文件扩展名
     */
    private String getExtension(String fileName) {
        if (!StringUtils.hasText(fileName)) {
            return "";
        }
        int dotIndex = fileName.lastIndexOf(".");
        if (dotIndex < 0 || dotIndex == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(dotIndex + 1).toLowerCase();
    }
}
