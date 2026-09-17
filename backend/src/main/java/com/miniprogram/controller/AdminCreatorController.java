package com.miniprogram.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.entity.CreatorApplication;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.CreatorApplicationMapper;
import com.miniprogram.mapper.UserMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@Tag(name = "管理端-创作者申请")
@RestController
@RequestMapping("/api/v1/admin/creators")
@RequiredArgsConstructor
public class AdminCreatorController {

    private final CreatorApplicationMapper creatorApplicationMapper;
    private final UserMapper userMapper;

    @GetMapping("/applications")
    @Operation(summary = "创作者申请列表")
    @PreAuthorize("hasAuthority('content:list') or hasAuthority('user:list')")
    public R<PageResult<CreatorApplication>> list(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") long current,
            @RequestParam(defaultValue = "20") long size) {
        LambdaQueryWrapper<CreatorApplication> qw = new LambdaQueryWrapper<>();
        qw.eq(StringUtils.hasText(status), CreatorApplication::getStatus, status);
        qw.orderByDesc(CreatorApplication::getCreatedAt);
        Page<CreatorApplication> page = creatorApplicationMapper.selectPage(new Page<>(current, size), qw);
        return R.ok(new PageResult<>(page.getRecords(), page.getTotal(), page.getCurrent(), page.getSize()));
    }

    @PutMapping("/applications/{id}/status")
    @Operation(summary = "审核创作者申请")
    @PreAuthorize("hasAuthority('content:update') or hasAuthority('user:update')")
    public R<CreatorApplication> updateStatus(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        CreatorApplication row = creatorApplicationMapper.selectById(id);
        if (row == null) {
            throw new BusinessException(404001, "申请不存在");
        }
        String status = body != null && body.get("status") != null ? String.valueOf(body.get("status")) : "";
        if (!"approved".equals(status) && !"rejected".equals(status) && !"pending".equals(status)) {
            throw new BusinessException(400001, "状态无效");
        }
        row.setStatus(status);
        if (body != null && body.get("rejectReason") != null) {
            row.setRejectReason(String.valueOf(body.get("rejectReason")));
        }
        row.setUpdatedAt(LocalDateTime.now());
        creatorApplicationMapper.updateById(row);
        if ("approved".equals(status) && row.getUserId() != null) {
            User user = userMapper.selectById(row.getUserId());
            if (user != null) {
                user.setCreatorRole("contributor");
                userMapper.updateById(user);
            }
        }
        return R.ok(row);
    }
}
