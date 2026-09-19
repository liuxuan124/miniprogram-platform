package com.miniprogram.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.R;
import com.miniprogram.entity.KnowledgeLibrary;
import com.miniprogram.mapper.KnowledgeLibraryMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/knowledge/libraries")
@RequiredArgsConstructor
@Tag(name = "后台-知识库分库")
public class KnowledgeLibraryController {

    private final KnowledgeLibraryMapper libraryMapper;

    @GetMapping
    @Operation(summary = "知识库列表")
    public R<List<KnowledgeLibrary>> list() {
        return R.ok(libraryMapper.selectList(new LambdaQueryWrapper<KnowledgeLibrary>()
                .orderByAsc(KnowledgeLibrary::getSortOrder)
                .orderByAsc(KnowledgeLibrary::getId)));
    }

    @PostMapping
    @Operation(summary = "新建知识库")
    public R<KnowledgeLibrary> create(@RequestBody Map<String, Object> body) {
        String name = body == null ? null : String.valueOf(body.getOrDefault("name", "")).trim();
        if (!StringUtils.hasText(name)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "请填写知识库名称");
        }
        KnowledgeLibrary lib = new KnowledgeLibrary();
        lib.setName(name);
        lib.setDescription(str(body, "description"));
        lib.setDefaultCitePolicy(normalizeCite(str(body, "defaultCitePolicy")));
        lib.setAutoIngestOnPublish(boolInt(body, "autoIngestOnPublish", 1));
        lib.setStatus(boolInt(body, "status", 1));
        lib.setSortOrder(intVal(body, "sortOrder", 0));
        lib.setCreateTime(LocalDateTime.now());
        lib.setUpdateTime(LocalDateTime.now());
        libraryMapper.insert(lib);
        return R.ok(lib);
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新知识库")
    public R<KnowledgeLibrary> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        KnowledgeLibrary lib = libraryMapper.selectById(id);
        if (lib == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "知识库不存在");
        }
        if (body != null && body.containsKey("name") && StringUtils.hasText(String.valueOf(body.get("name")))) {
            lib.setName(String.valueOf(body.get("name")).trim());
        }
        if (body != null && body.containsKey("description")) {
            lib.setDescription(str(body, "description"));
        }
        if (body != null && body.containsKey("defaultCitePolicy")) {
            lib.setDefaultCitePolicy(normalizeCite(str(body, "defaultCitePolicy")));
        }
        if (body != null && body.containsKey("autoIngestOnPublish")) {
            lib.setAutoIngestOnPublish(boolInt(body, "autoIngestOnPublish", 1));
        }
        if (body != null && body.containsKey("status")) {
            lib.setStatus(boolInt(body, "status", 1));
        }
        if (body != null && body.containsKey("sortOrder")) {
            lib.setSortOrder(intVal(body, "sortOrder", 0));
        }
        lib.setUpdateTime(LocalDateTime.now());
        libraryMapper.updateById(lib);
        return R.ok(lib);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除知识库（默认库不可删）")
    public R<Void> delete(@PathVariable Long id) {
        if (id != null && id == 1L) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "默认知识库不可删除");
        }
        KnowledgeLibrary lib = libraryMapper.selectById(id);
        if (lib == null) {
            return R.ok();
        }
        libraryMapper.deleteById(id);
        return R.ok();
    }

    private static String str(Map<String, Object> body, String key) {
        if (body == null || body.get(key) == null) return null;
        String v = String.valueOf(body.get(key)).trim();
        return v.isEmpty() || "null".equals(v) ? null : v;
    }

    private static int boolInt(Map<String, Object> body, String key, int def) {
        if (body == null || !body.containsKey(key) || body.get(key) == null) return def;
        Object v = body.get(key);
        if (v instanceof Boolean b) return b ? 1 : 0;
        String s = String.valueOf(v);
        if ("1".equals(s) || "true".equalsIgnoreCase(s)) return 1;
        if ("0".equals(s) || "false".equalsIgnoreCase(s)) return 0;
        return def;
    }

    private static int intVal(Map<String, Object> body, String key, int def) {
        if (body == null || body.get(key) == null) return def;
        try {
            return Integer.parseInt(String.valueOf(body.get(key)));
        } catch (Exception e) {
            return def;
        }
    }

    private static String normalizeCite(String raw) {
        if (!StringUtils.hasText(raw)) return "full";
        String v = raw.trim().toLowerCase(Locale.ROOT);
        return ("summary".equals(v) || "none".equals(v) || "full".equals(v)) ? v : "full";
    }
}
