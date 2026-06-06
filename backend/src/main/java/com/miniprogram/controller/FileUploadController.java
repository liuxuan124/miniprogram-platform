package com.miniprogram.controller;

import com.miniprogram.annotation.OperationLog;
import com.miniprogram.common.R;
import com.miniprogram.dto.system.UploadResultVO;
import com.miniprogram.service.FileUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * 后台-文件上传
 */
@RestController
@RequestMapping("/api/v1/admin/system")
@RequiredArgsConstructor
@Tag(name = "后台-系统管理")
public class FileUploadController {

    private final FileUploadService fileUploadService;

    @PostMapping("/upload")
    @Operation(summary = "文件上传")
    @OperationLog("上传文件")
    public R<UploadResultVO> upload(@RequestParam("file") MultipartFile file,
                                     @RequestParam(value = "subDir", required = false) String subDir) {
        UploadResultVO result;
        if (subDir != null && !subDir.isEmpty()) {
            result = fileUploadService.upload(file, subDir);
        } else {
            result = fileUploadService.upload(file);
        }
        return R.ok(result);
    }
}
