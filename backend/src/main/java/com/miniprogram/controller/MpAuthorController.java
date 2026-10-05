package com.miniprogram.controller;

import com.miniprogram.common.BusinessException;
import com.miniprogram.common.R;
import com.miniprogram.dto.AuthorDTO;
import com.miniprogram.service.AuthorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 小程序端作者档案公开接口
 * 给小程序作者卡片 / 作者作品列表页用，仅返回 status=enabled 的档案。
 */
@Tag(name = "小程序-作者档案", description = "作者档案公开查询")
@RestController
@RequestMapping("/api/v1/mp/authors")
@RequiredArgsConstructor
public class MpAuthorController {

    /** 作者主页真实路径（分包子包 author-feed/author-feed，入参 id + author 两个） */
    private static final String AUTHOR_HOME_PATH = "/pkg-content/author-feed/author-feed";

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

    /**
     * 作者聚合列表（V121，装修器 warm_authors 区块「动态聚合」模式专用）。
     *
     * 为什么需要这个接口：以前首页作者位只有运营在装修器里手填的快照，
     * 新作者入库后首页不会出现，必须手工再配一次。现在改成按规则实时聚合。
     *
     * tags 支持逗号分隔多值（也兼容重复 query 参数），语义为 OR：命中任一标签即入选。
     * sortBy：weight(默认) / latest / article_count。limit 收敛3~8。
     *
     * 返回体带 homePath —— 作者主页路径由后端统一拼，端上不各自拼字符串，
     * 这是「手写路径易 404」的根治点。
     */
    @Operation(summary = "作者聚合列表",
            description = "按标签多选筛选 + 排序权重 + 数量限制，返回含 homePath 的作者卡片数据")
    @GetMapping
    public R<List<Map<String, Object>>> list(@RequestParam(required = false) String tags,
                                             @RequestParam(required = false) String sortBy,
                                             @RequestParam(required = false) Integer limit,
                                             @RequestParam(required = false) String keyword) {
        List<String> tagList = splitTags(tags);
        List<AuthorDTO> rows = authorService.listAuthorsForAggregation(tagList, sortBy, limit);
        if (hasText(keyword)) {
            String kw = keyword.trim();
            rows = rows.stream()
                    .filter(a -> contains(a, kw))
                    .collect(Collectors.toList());
        }
        List<Map<String, Object>> list = new ArrayList<>(rows.size());
        for (AuthorDTO a : rows) {
            Map<String, Object> vo = new HashMap<>();
            vo.put("id", a.getId());
            vo.put("name", a.getName());
            vo.put("avatarUrl", a.getAvatarUrl());
            vo.put("title", a.getTitle());
            vo.put("tags", splitTags(a.getTags()));
            vo.put("homePath", buildHomePath(a));
            list.add(vo);
        }
        return R.ok(list);
    }

    /** 作者主页路径统一出口：id 必带，name 带上用于页面标题（不 URL-encode，中文由端上 decode） */
    private String buildHomePath(AuthorDTO a) {
        StringBuilder sb = new StringBuilder(AUTHOR_HOME_PATH);
        sb.append("?id=").append(a.getId() == null ? "" : a.getId());
        String name = a.getName() == null ? "" : a.getName().trim();
        if (!name.isEmpty()) {
            sb.append("&author=").append(name);
        }
        return sb.toString();
    }

    private List<String> splitTags(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return List.of();
        }
        return Arrays.stream(raw.split("[,，]"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .collect(Collectors.toList());
    }

    private boolean contains(AuthorDTO a, String kw) {
        return (a.getName() != null && a.getName().contains(kw))
                || (a.getTitle() != null && a.getTitle().contains(kw));
    }

    private boolean hasText(String s) {
        return s != null && !s.trim().isEmpty();
    }
}
