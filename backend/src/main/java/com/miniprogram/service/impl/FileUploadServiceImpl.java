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
            "txt", "md", "markdown", "csv",
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
        return saveBytesToUploadDir(file, subDir, originalFileName, ext);
    }

    @Override
    public UploadResultVO uploadBytes(byte[] data, String originalFileName, String subDir) {
        if (data == null || data.length == 0) {
            throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
        }
        String ext = getExtension(originalFileName);
        if (!StringUtils.hasText(ext) || !ALLOWED_EXTENSIONS.contains(ext.toLowerCase())) {
            ext = "jpg";
            originalFileName = (StringUtils.hasText(originalFileName) ? originalFileName : "remote") + ".jpg";
        }
        String maxSizeStr = systemConfigService.getConfigValue("upload_max_size", String.valueOf(DEFAULT_MAX_SIZE));
        long maxSize;
        try {
            maxSize = Long.parseLong(maxSizeStr);
        } catch (NumberFormatException e) {
            maxSize = DEFAULT_MAX_SIZE;
        }
        if (data.length > maxSize) {
            throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
        }
        return saveBytesToUploadDir(data, subDir, originalFileName, ext);
    }

    private UploadResultVO saveBytesToUploadDir(MultipartFile file, String subDir, String originalFileName, String ext) {
        String relativePath = buildRelativePath(subDir, ext);
        try {
            Path filePath = Paths.get(uploadDir, relativePath);
            Files.createDirectories(filePath.getParent());
            Files.copy(file.getInputStream(), filePath);
            log.info("文件上传成功: {}", filePath);
        } catch (IOException e) {
            log.error("文件上传失败: {}", e.getMessage(), e);
            throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
        }
        return buildUploadResult(originalFileName, relativePath, file.getSize(), file.getContentType());
    }

    private UploadResultVO saveBytesToUploadDir(byte[] data, String subDir, String originalFileName, String ext) {
        String relativePath = buildRelativePath(subDir, ext);
        try {
            Path filePath = Paths.get(uploadDir, relativePath);
            Files.createDirectories(filePath.getParent());
            Files.write(filePath, data);
            log.info("字节文件上传成功: {}", filePath);
        } catch (IOException e) {
            log.error("字节文件上传失败: {}", e.getMessage(), e);
            throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
        }
        return buildUploadResult(originalFileName, relativePath, data.length, "application/octet-stream");
    }

    private String buildRelativePath(String subDir, String ext) {
        String datePath = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        String fileName = UUID.randomUUID().toString().replace("-", "") + "." + ext;
        if (StringUtils.hasText(subDir)) {
            return subDir + "/" + datePath + "/" + fileName;
        }
        return datePath + "/" + fileName;
    }

    private UploadResultVO buildUploadResult(String originalFileName, String relativePath, long size, String contentType) {
        UploadResultVO result = new UploadResultVO();
        result.setFileName(relativePath.substring(relativePath.lastIndexOf('/') + 1));
        result.setOriginalFileName(originalFileName);
        result.setUrl(baseUrl + "/uploads/" + relativePath);
        result.setFileSize(size);
        result.setContentType(contentType);
        return result;
    }

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
