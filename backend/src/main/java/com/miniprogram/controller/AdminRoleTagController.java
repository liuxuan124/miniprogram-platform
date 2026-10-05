package com.miniprogram.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.R;
import com.miniprogram.entity.MemberTag;
import com.miniprogram.entity.UserMemberTag;
import com.miniprogram.mapper.MemberTagMapper;
import com.miniprogram.mapper.UserMemberTagMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 用户管理 › 角色标签。
 *
 * <p><b>为什么不用 mp_member_tag 的现有接口：</b>那个接口只管「名称/颜色/说明」，
 * 没有 {@code isRole / roleCode} 概念，运营无法表达「这是角色标签」。
 * 本类把「角色」做成标签的一个维度：{@code is_role=1} 的行就是角色，
 * 可以在后台自由增删改（不写死枚举），端上则按稳定的 {@code role_code} 判断能力。
 *
 * <p><b>为什么不走 /api/v1/admin/system/**：</b>该前缀在 SecurityConfig 的
 * super_admin 专属名单里，运营角色（content_ops / biz_ops）调会 403。
 * 本类走 {@code /api/v1/admin/ops/**}，只需登录 —— 与私域引流/搜索运营一致。
 *
 * <p>数据落在既有表 {@code mp_member_tag}（V114 加的 is_role/role_code 两列），
 * 本类<b>不含 DDL</b>。
 */
@Slf4j
@Tag(name = "用户管理-角色标签")
@RestController
@RequestMapping("/api/v1/admin/ops/role-tags")
@RequiredArgsConstructor
public class AdminRoleTagController {

    private final MemberTagMapper memberTagMapper;
    private final UserMemberTagMapper userMemberTagMapper;

    @Operation(summary = "角色标签列表", description = "isRole=1 的标签，附已挂用户数")
    @GetMapping
    public R<List<RoleTagVO>> list() {
        List<MemberTag> tags = memberTagMapper.selectList(
                new LambdaQueryWrapper<MemberTag>()
                        .eq(MemberTag::getIsRole, 1)
                        .orderByAsc(MemberTag::getSortOrder)
                        .orderByAsc(MemberTag::getId));
        if (tags.isEmpty()) {
            return R.ok(List.of());
        }
        // 已挂人数：一次 group by，不做 N+1
        List<Long> tagIds = tags.stream().map(MemberTag::getId).collect(Collectors.toList());
        com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<UserMemberTag> qw =
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<>();
        qw.select("tag_id AS tagId", "COUNT(DISTINCT user_id) AS cnt")
                .in("tag_id", tagIds)
                .groupBy("tag_id");
        Map<Long, Integer> useCount = new HashMap<>();
        for (Map<String, Object> row : userMemberTagMapper.selectMaps(qw)) {
            Object tid = row.get("tagId");
            Object cnt = row.get("cnt");
            if (tid instanceof Number && cnt instanceof Number) {
                useCount.put(((Number) tid).longValue(), ((Number) cnt).intValue());
            }
        }
        List<RoleTagVO> list = new ArrayList<>();
        for (MemberTag t : tags) {
            RoleTagVO vo = new RoleTagVO();
            vo.setId(t.getId());
            vo.setName(t.getName());
            vo.setColor(t.getColor());
            vo.setRoleCode(t.getRoleCode());
            vo.setDescription(t.getDescription());
            vo.setSortOrder(t.getSortOrder());
            vo.setStatus(t.getStatus());
            vo.setUserCount(useCount.getOrDefault(t.getId(), 0));
            list.add(vo);
        }
        return R.ok(list);
    }

    @Operation(summary = "新建角色标签")
    @PostMapping
    public R<RoleTagVO> create(@RequestBody RoleTagForm form) {
        String name = trim(form.getName());
        if (name.isEmpty()) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "角色名不能为空");
        }
        if (name.length() > 32) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "角色名最长 32 个字符");
        }
        String roleCode = trim(form.getRoleCode());
        if (!roleCode.isEmpty()) {
            assertRoleCodeFree(roleCode, null);
        }
        MemberTag tag = new MemberTag();
        tag.setName(name);
        tag.setColor(emptyToDefault(form.getColor(), "#C08E6E"));
        tag.setIsRole(1);
        tag.setRoleCode(roleCode.isEmpty() ? null : roleCode);
        tag.setDescription(trim(form.getDescription()));
        tag.setUseCount(0);
        tag.setStatus(form.getStatus() == null ? 1 : form.getStatus());
        tag.setSortOrder(form.getSortOrder() == null ? 100 : form.getSortOrder());
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        tag.setCreateTime(now);
        tag.setUpdateTime(now);
        memberTagMapper.insert(tag);
        return R.ok(toVO(tag, 0));
    }

    @Operation(summary = "编辑角色标签", description = "roleCode 不可改（端上按它判断能力）")
    @PutMapping("/{id}")
    public R<RoleTagVO> update(@PathVariable Long id, @RequestBody RoleTagForm form) {
        MemberTag tag = requireTag(id);
        if (StringUtils.hasText(form.getName())) {
            String name = trim(form.getName());
            if (name.length() > 32) {
                throw new BusinessException(ErrorCode.PARAM_ERROR, "角色名最长 32 个字符");
            }
            tag.setName(name);
        }
        if (StringUtils.hasText(form.getColor())) {
            tag.setColor(form.getColor());
        }
        if (form.getDescription() != null) {
            tag.setDescription(trim(form.getDescription()));
        }
        if (form.getSortOrder() != null) {
            tag.setSortOrder(form.getSortOrder());
        }
        if (form.getStatus() != null) {
            tag.setStatus(form.getStatus());
        }
        tag.setUpdateTime(java.time.LocalDateTime.now());
        memberTagMapper.updateById(tag);
        return R.ok(toVO(tag, countUsers(tag.getId())));
    }

    @Operation(summary = "删除角色标签", description = "已挂在用户上的标签会先解绑再删；普通标签不受影响")
    @DeleteMapping("/{id}")
    @Transactional(rollbackFor = Exception.class)
    public R<Void> delete(@PathVariable Long id) {
        MemberTag tag = requireTag(id);
        userMemberTagMapper.delete(new LambdaQueryWrapper<UserMemberTag>().eq(UserMemberTag::getTagId, id));
        memberTagMapper.deleteById(id);
        log.info("[角色标签] 删除角色标签 id={} name={}，已解绑关联用户", id, tag.getName());
        return R.ok();
    }

    @Operation(summary = "给一批用户打角色标签", description = "已存在的标签不重复插入")
    @PostMapping("/assign")
    public R<Integer> assign(@RequestBody AssignForm form) {
        if (form.getTagId() == null) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "请选择角色标签");
        }
        List<Long> userIds = form.getUserIds();
        if (userIds == null || userIds.isEmpty()) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "请选择用户");
        }
        requireTag(form.getTagId());
        int added = 0;
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        for (Long uid : new HashSet<>(userIds)) {
            if (uid == null) {
                continue;
            }
            // 同上：selectCount 返回 Long，用 longValue 比较避免类型问题
            Long exists = userMemberTagMapper.selectCount(
                    new LambdaQueryWrapper<UserMemberTag>()
                            .eq(UserMemberTag::getUserId, uid)
                            .eq(UserMemberTag::getTagId, form.getTagId()));
            if (exists != null && exists.longValue() > 0) {
                continue;
            }
            UserMemberTag rel = new UserMemberTag();
            rel.setUserId(uid);
            rel.setTagId(form.getTagId());
            rel.setCreateTime(now);
            userMemberTagMapper.insert(rel);
            added++;
        }
        refreshUseCount(form.getTagId());
        return R.ok(added);
    }

    @Operation(summary = "移除用户的某个角色标签")
    @DeleteMapping("/assign")
    public R<Void> unassign(@RequestParam Long tagId, @RequestParam Long userId) {
        userMemberTagMapper.delete(new LambdaQueryWrapper<UserMemberTag>()
                .eq(UserMemberTag::getTagId, tagId)
                .eq(UserMemberTag::getUserId, userId));
        refreshUseCount(tagId);
        return R.ok();
    }

    @Operation(summary = "取某批用户已挂的角色标签名", description = "用户详情抽屉用；逗号分隔")
    @GetMapping("/of-users")
    public R<Map<Long, String>> ofUsers(@RequestParam List<Long> userIds) {
        Map<Long, String> result = new HashMap<>();
        if (userIds == null || userIds.isEmpty()) {
            return R.ok(result);
        }
        List<MemberTag> roleTags = memberTagMapper.selectList(
                new LambdaQueryWrapper<MemberTag>().eq(MemberTag::getIsRole, 1));
        if (roleTags.isEmpty()) {
            return R.ok(result);
        }
        Map<Long, String> tagNames = roleTags.stream()
                .filter(t -> t.getId() != null && t.getName() != null)
                .collect(Collectors.toMap(MemberTag::getId, MemberTag::getName, (a, b) -> a));
        List<Long> roleTagIds = new ArrayList<>(tagNames.keySet());

        com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<UserMemberTag> qw =
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<>();
        qw.select("user_id AS userId", "tag_id AS tagId")
                .in("user_id", userIds)
                .in("tag_id", roleTagIds);
        Map<Long, List<Long>> userToTags = new HashMap<>();
        for (Map<String, Object> row : userMemberTagMapper.selectMaps(qw)) {
            Object uid = row.get("userId");
            Object tid = row.get("tagId");
            if (uid instanceof Number && tid instanceof Number) {
                userToTags.computeIfAbsent(((Number) uid).longValue(), k -> new ArrayList<>())
                        .add(((Number) tid).longValue());
            }
        }
        // 3 次查询拿全（角色表 / 关联表 / 已在内存映射），无 N+1
        userToTags.forEach((uid, tagIds) -> {
            List<String> hit = tagIds.stream()
                    .map(tagNames::get)
                    .filter(java.util.Objects::nonNull)
                    .distinct()
                    .collect(Collectors.toList());
            if (!hit.isEmpty()) {
                result.put(uid, String.join(",", hit));
            }
        });
        return R.ok(result);
    }

    // ==================== 内部方法 ====================

    private MemberTag requireTag(Long id) {
        MemberTag tag = memberTagMapper.selectById(id);
        if (tag == null || !Integer.valueOf(1).equals(tag.getIsRole())) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "角色标签不存在");
        }
        return tag;
    }

    private void assertRoleCodeFree(String roleCode, Long selfId) {
        MemberTag exists = memberTagMapper.selectOne(new LambdaQueryWrapper<MemberTag>()
                .eq(MemberTag::getRoleCode, roleCode)
                .last("LIMIT 1"));
        if (exists != null && !exists.getId().equals(selfId)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "角色代码「" + roleCode + "」已被占用");
        }
    }

    private int countUsers(Long tagId) {
        // 注意：本项目 MyBatis-Plus 的 selectCount 返回 Long（不是 Number），
        // 直接 (int) 强转会编译失败，必须走 Number.longValue()
        Long cnt = userMemberTagMapper.selectCount(
                new LambdaQueryWrapper<UserMemberTag>().eq(UserMemberTag::getTagId, tagId));
        return cnt == null ? 0 : cnt.intValue();
    }

    /** 打/解绑后同步 use_count，列表页直接读该列，不用每次聚合 */
    private void refreshUseCount(Long tagId) {
        MemberTag tag = memberTagMapper.selectById(tagId);
        if (tag == null) {
            return;
        }
        tag.setUseCount(countUsers(tagId));
        tag.setUpdateTime(java.time.LocalDateTime.now());
        memberTagMapper.updateById(tag);
    }

    private RoleTagVO toVO(MemberTag t, int userCount) {
        RoleTagVO vo = new RoleTagVO();
        vo.setId(t.getId());
        vo.setName(t.getName());
        vo.setColor(t.getColor());
        vo.setRoleCode(t.getRoleCode());
        vo.setDescription(t.getDescription());
        vo.setSortOrder(t.getSortOrder());
        vo.setStatus(t.getStatus());
        vo.setUserCount(userCount);
        return vo;
    }

    private static String trim(String s) {
        return s == null ? "" : s.trim();
    }

    private static String emptyToDefault(String s, String def) {
        String v = trim(s);
        return v.isEmpty() ? def : v;
    }

    // ==================== 出入参 ====================

    @Data
    public static class RoleTagVO {
        private Long id;
        private String name;
        private String color;
        private String roleCode;
        private String description;
        private Integer sortOrder;
        private Integer status;
        /** 已挂该角色的用户数 */
        private Integer userCount;
    }

    @Data
    public static class RoleTagForm {
        private String name;
        private String color;
        private String roleCode;
        private String description;
        private Integer sortOrder;
        private Integer status;
    }

    @Data
    public static class AssignForm {
        private Long tagId;
        private List<Long> userIds;
    }
}
