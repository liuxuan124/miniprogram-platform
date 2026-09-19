package com.miniprogram.controller;

import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.R;
import com.miniprogram.dto.system.Base64UploadRequest;
import com.miniprogram.dto.system.UploadResultVO;
import com.miniprogram.service.FileUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;

/**
 * 小程序文件上传
 */
@RestController
@RequestMapping("/api/v1/mp")
@RequiredArgsConstructor
@Tag(name = "小程序-上传", description = "头像等文件上传")
public class MpUploadController {

    private final FileUploadService fileUploadService;

    @PostMapping("/upload")
    @Operation(summary = "小程序文件上传")
    public R<UploadResultVO> upload(@RequestParam("file") MultipartFile file,
                                    @RequestParam(value = "subDir", required = false) String subDir) {
        String dir = (subDir != null && !subDir.isEmpty()) ? subDir : "mp";
        return R.ok(fileUploadService.upload(file, dir));
    }

    /**
     * Base64 上传：当体验版/正式版未配置 uploadFile 合法域名时，
     * wx.uploadFile 会在客户端直接 fail（nginx 无命中），可改走 wx.request（request 合法域名）。
     */
    @PostMapping("/upload-base64")
    @Operation(summary = "小程序 Base64 文件上传")
    public R<UploadResultVO> uploadBase64(@RequestBody Base64UploadRequest body) {
        if (body == null || !StringUtils.hasText(body.getContentBase64())) {
            throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "文件内容为空");
        }
        String raw = body.getContentBase64().trim();
        int comma = raw.indexOf(',');
        if (raw.regionMatches(true, 0, "data:", 0, 5) && comma > 0) {
            raw = raw.substring(comma + 1);
        }
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(raw);
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "文件内容无效");
        }
        if (bytes.length == 0) {
            throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
        }
        String fileName = StringUtils.hasText(body.getFileName()) ? body.getFileName().trim() : "avatar.jpg";
        String dir = StringUtils.hasText(body.getSubDir()) ? body.getSubDir().trim() : "mp";
        return R.ok(fileUploadService.uploadBytes(bytes, fileName, dir));
    }
}
