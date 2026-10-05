package com.miniprogram.controller;

import com.miniprogram.common.BusinessException;
import com.miniprogram.common.R;
import com.miniprogram.dto.AuthorDTO;
import com.miniprogram.service.AuthorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 小程序端作者档案公开接口
 * 给小程序作者卡片 / 作者作品列表页用，仅返回 status=enabled 的档案。
 */
@Tag(name = "小程序-作者档案", description = "作者档案公开查询")
@RestController
@RequestMapping("/api/v1/mp/authors")
@RequiredArgsConstructor
public class MpAuthorController {

    private final AuthorService authorService;

    @Operation(summary = "作者档案详情", description = "按 ID 取作者档案，仅 enabled 可见；不可见或不存在抛 404")
    @GetMapping("/{id}")
    public R<Map<String, Object>> getAuthor(@PathVariable Long id) {
        if (id == null || id <= 0) {
            throw new BusinessException(400001, "参数错误");
        }
        AuthorDTO dto = authorService.getAuthorById(id);
        if (dto == null || (dto.getStatus() != null && dto.getStatus() != 1)) {
            throw new BusinessException(404001, "作者不存在或已停用");
        }
        Map<String, Object> vo = new HashMap<>();
        vo.put("id", dto.getId());
        vo.put("name", dto.getName());
        vo.put("avatarUrl", dto.getAvatarUrl());
        vo.put("role", dto.getRole());
        vo.put("title", dto.getTitle());
        vo.put("intro", dto.getIntro());
        return R.ok(vo);
    }
}
