package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.file.*;
import com.miniprogram.service.FileItemService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/files")
@RequiredArgsConstructor
@Tag(name = "后台-文件库")
public class AdminFileController {

    private final FileItemService fileItemService;

    @GetMapping
    @Operation(summary = "文件列表")
    public R<PageResult<FileItemVO>> list(@RequestParam(required = false) Long groupId,
                                         @RequestParam(required = false) String keyword,
                                         @RequestParam(required = false) String status,
                                         @RequestParam(defaultValue = "1") Long current,
                                         @RequestParam(defaultValue = "10") Long size) {
        return R.ok(fileItemService.listFiles(groupId, keyword, status, current, size));
    }

    @GetMapping("/{id}")
    @Operation(summary = "文件详情")
    public R<FileItemVO> detail(@PathVariable Long id) {
        return R.ok(fileItemService.getFile(id));
    }

    @PostMapping
    @Operation(summary = "创建文件记录")
    public R<FileItemVO> create(@Valid @RequestBody FileItemDTO dto) {
        return R.ok(fileItemService.createFile(dto));
    }

    @PostMapping("/upload")
    @Operation(summary = "上传并创建文件")
    public R<FileItemVO> upload(@RequestParam("file") MultipartFile file,
                                @ModelAttribute FileItemDTO dto) {
        return R.ok(fileItemService.uploadAndCreate(file, dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新文件")
    public R<FileItemVO> update(@PathVariable Long id, @Valid @RequestBody FileItemDTO dto) {
        return R.ok(fileItemService.updateFile(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除文件")
    public R<Void> delete(@PathVariable Long id) {
        fileItemService.deleteFile(id);
        return R.ok(null);
    }

    @GetMapping("/groups")
    @Operation(summary = "分组列表")
    public R<List<FileGroupVO>> groups() {
        return R.ok(fileItemService.listGroups());
    }

    @PostMapping("/groups")
    @Operation(summary = "创建分组")
    public R<FileGroupVO> createGroup(@Valid @RequestBody FileGroupDTO dto) {
        return R.ok(fileItemService.createGroup(dto));
    }

    @PutMapping("/groups/{id}")
    @Operation(summary = "更新分组")
    public R<FileGroupVO> updateGroup(@PathVariable Long id, @Valid @RequestBody FileGroupDTO dto) {
        return R.ok(fileItemService.updateGroup(id, dto));
    }

    @DeleteMapping("/groups/{id}")
    @Operation(summary = "删除分组")
    public R<Void> deleteGroup(@PathVariable Long id) {
        fileItemService.deleteGroup(id);
        return R.ok(null);
    }
}
