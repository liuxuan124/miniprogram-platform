package com.miniprogram.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.R;
import com.miniprogram.entity.MemberTag;
import com.miniprogram.mapper.MemberTagMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/member-tags")
@RequiredArgsConstructor
@Tag(name = "后台-会员标签")
public class AdminMemberTagController {

    private final MemberTagMapper memberTagMapper;

    @GetMapping
    @Operation(summary = "会员标签列表")
    public R<List<MemberTag>> list(@RequestParam(required = false) String keyword) {
        LambdaQueryWrapper<MemberTag> w = new LambdaQueryWrapper<MemberTag>()
                .orderByAsc(MemberTag::getSortOrder)
                .orderByDesc(MemberTag::getUseCount)
                .orderByDesc(MemberTag::getId);
        if (StringUtils.hasText(keyword)) {
            w.like(MemberTag::getName, keyword.trim());
        }
        return R.ok(memberTagMapper.selectList(w));
    }

    @PostMapping
    @Operation(summary = "创建会员标签")
    public R<MemberTag> create(@RequestBody Map<String, Object> body) {
        String name = body == null ? null : String.valueOf(body.getOrDefault("name", "")).trim();
        if (!StringUtils.hasText(name)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "请填写标签名");
        }
        Long exists = memberTagMapper.selectCount(new LambdaQueryWrapper<MemberTag>()
                .eq(MemberTag::getName, name));
        if (exists != null && exists > 0) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "标签已存在");
        }
        MemberTag tag = new MemberTag();
        tag.setName(name);
        tag.setColor(str(body, "color"));
        tag.setDescription(str(body, "description"));
        tag.setUseCount(0);
        tag.setStatus(1);
        tag.setSortOrder(0);
        tag.setCreateTime(LocalDateTime.now());
        tag.setUpdateTime(LocalDateTime.now());
        memberTagMapper.insert(tag);
        return R.ok(tag);
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新会员标签")
    public R<MemberTag> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        MemberTag tag = memberTagMapper.selectById(id);
        if (tag == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "标签不存在");
        }
        if (body != null && body.containsKey("name") && StringUtils.hasText(String.valueOf(body.get("name")))) {
            String name = String.valueOf(body.get("name")).trim();
            Long dup = memberTagMapper.selectCount(new LambdaQueryWrapper<MemberTag>()
                    .eq(MemberTag::getName, name)
                    .ne(MemberTag::getId, id));
            if (dup != null && dup > 0) {
                throw new BusinessException(ErrorCode.PARAM_ERROR, "标签名已存在");
            }
            tag.setName(name);
        }
        if (body != null && body.containsKey("color")) {
            tag.setColor(str(body, "color"));
        }
        if (body != null && body.containsKey("description")) {
            tag.setDescription(str(body, "description"));
        }
        if (body != null && body.containsKey("status")) {
            Object v = body.get("status");
            tag.setStatus(Boolean.TRUE.equals(v) || "1".equals(String.valueOf(v)) ? 1 : 0);
        }
        tag.setUpdateTime(LocalDateTime.now());
        memberTagMapper.updateById(tag);
        return R.ok(tag);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除会员标签")
    public R<Void> delete(@PathVariable Long id) {
        memberTagMapper.deleteById(id);
        return R.ok();
    }

    private static String str(Map<String, Object> body, String key) {
        if (body == null || body.get(key) == null) return null;
        String v = String.valueOf(body.get(key)).trim();
        return v.isEmpty() || "null".equals(v) ? null : v;
    }
}
