package com.miniprogram.controller;

import com.miniprogram.common.R;
import com.miniprogram.dto.member.MemberLevelDTO;
import com.miniprogram.dto.member.MemberLevelVO;
import com.miniprogram.service.MemberLevelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 后台-会员等级管理
 */
@RestController
@RequestMapping("/api/v1/admin/member-levels")
@RequiredArgsConstructor
@Tag(name = "后台-会员等级管理")
public class AdminMemberLevelController {

    private final MemberLevelService memberLevelService;

    @GetMapping
    @Operation(summary = "会员等级列表")
    public R<List<MemberLevelVO>> listLevels() {
        return R.ok(memberLevelService.listAll());
    }

    @PostMapping
    @Operation(summary = "创建会员等级")
    public R<MemberLevelVO> createLevel(@Valid @RequestBody MemberLevelDTO dto) {
        return R.ok(memberLevelService.createLevel(dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新会员等级")
    public R<MemberLevelVO> updateLevel(@PathVariable Long id,
                                         @Valid @RequestBody MemberLevelDTO dto) {
        return R.ok(memberLevelService.updateLevel(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除会员等级")
    public R<Void> deleteLevel(@PathVariable Long id) {
        memberLevelService.deleteLevel(id);
        return R.ok(null);
    }
}
