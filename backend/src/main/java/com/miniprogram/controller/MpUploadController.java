package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.system.UploadResultVO;
import com.miniprogram.service.FileUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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
}
