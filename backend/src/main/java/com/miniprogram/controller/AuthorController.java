package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.AuthorDTO;
import com.miniprogram.service.AuthorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 作者档案管理控制器（管理后台）
 * 发布内容时下拉选择作者，自动带出头像和身份。
 */
@Tag(name = "作者档案管理", description = "作者档案 CRUD")
@RestController
@RequestMapping("/api/v1/admin/authors")
@RequiredArgsConstructor
public class AuthorController {

    private final AuthorService authorService;

    @Operation(summary = "作者列表",
            description = "按 sort_order 升序；status 不传=全部；role/userId/keyword 可筛选（V114 起支持按角色与关联用户）")
    @GetMapping
    public R<List<AuthorDTO>> list(@RequestParam(required = false) Integer status,
                                   @RequestParam(required = false) String role,
                                   @RequestParam(required = false) Long userId,
                                   @RequestParam(required = false) String keyword) {
        return R.ok(authorService.listAuthors(status, role, userId, keyword));
    }

    @Operation(summary = "创建作者")
    @PostMapping
    public R<AuthorDTO> create(@Valid @RequestBody AuthorDTO dto) {
        return R.ok(authorService.createAuthor(dto));
    }

    @Operation(summary = "更新作者")
    @PutMapping("/{id}")
    public R<AuthorDTO> update(@PathVariable Long id, @Valid @RequestBody AuthorDTO dto) {
        return R.ok(authorService.updateAuthor(id, dto));
    }

    @Operation(summary = "删除作者", description = "被内容引用时禁止删除")
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        authorService.deleteAuthor(id);
        return R.ok();
    }

    @Operation(summary = "批量关联历史内容",
            description = "把 author_id 为空且 author 名字匹配该作者昵称的内容全部关联到该档案，空缺的头像/身份自动回填")
    @PostMapping("/{id}/link-contents")
    public R<Integer> linkContents(@PathVariable Long id) {
        return R.ok(authorService.linkContents(id));
    }
}