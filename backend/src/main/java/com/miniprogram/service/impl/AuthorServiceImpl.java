package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.dto.AuthorDTO;
import com.miniprogram.entity.Author;
import com.miniprogram.entity.Content;
import com.miniprogram.entity.MemberTag;
import com.miniprogram.entity.Product;
import com.miniprogram.entity.User;
import com.miniprogram.entity.UserMemberTag;
import com.miniprogram.mapper.AuthorMapper;
import com.miniprogram.mapper.ContentMapper;
import com.miniprogram.mapper.MemberTagMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.mapper.UserMemberTagMapper;
import com.miniprogram.service.AuthorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 作者档案 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthorServiceImpl extends BaseServiceImpl<AuthorMapper, Author>
        implements AuthorService {

    private final ContentMapper contentMapper;

    private final ProductMapper productMapper;

    private final UserMapper userMapper;

    private final MemberTagMapper memberTagMapper;

    private final UserMemberTagMapper userMemberTagMapper;

    @Override
    public List<AuthorDTO> listAuthors(Integer status, String role, Long userId, String keyword) {
        LambdaQueryWrapper<Author> wrapper = new LambdaQueryWrapper<>();
        if (status != null) {
            wrapper.eq(Author::getStatus, status);
        }
        if (StringUtils.hasText(role)) {
            wrapper.eq(Author::getRole, role);
        }
        if (userId != null) {
            wrapper.eq(Author::getUserId, userId);
        }
        if (StringUtils.hasText(keyword)) {
            String kw = keyword.trim();
            wrapper.and(w -> w.like(Author::getName, kw)
                    .or().like(Author::getTitle, kw)
                    .or().like(Author::getIntro, kw));
        }
        wrapper.orderByAsc(Author::getSortOrder).orderByAsc(Author::getId);
        List<AuthorDTO> list = this.list(wrapper).stream().map(this::toDTO).collect(Collectors.toList());
        fillCounts(list);
        fillUserInfo(list);
        return list;
    }

    /**
     * 回填「关联用户昵称 + 角色标签名」。
     * 作者接了小程序用户后，后台要能一眼看出「这个作者 = 这个用户」，
     * 以及他在用户池里被打了哪些角色标签（V114 的核心价值）。
     * 两次批量查询搞定，不做 N+1。
     */
    private void fillUserInfo(List<AuthorDTO> list) {
        if (list == null || list.isEmpty()) {
            return;
        }
        List<Long> userIds = list.stream()
                .map(AuthorDTO::getUserId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        if (userIds.isEmpty()) {
            return;
        }
        // 1. 用户昵称
        com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<User> uw =
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<>();
        uw.select("id", "nickname").in("id", userIds);
        Map<Long, String> nicknames = new HashMap<>();
        for (Map<String, Object> row : userMapper.selectMaps(uw)) {
            Object id = row.get("id");
            if (id instanceof Number) {
                nicknames.put(((Number) id).longValue(),
                        row.get("nickname") == null ? null : String.valueOf(row.get("nickname")));
            }
        }
        // 2. 角色标签（is_role=1）
        Map<Long, List<String>> roleTags = loadRoleTagsByUserIds(userIds);
        for (AuthorDTO dto : list) {
            if (dto.getUserId() == null) {
                continue;
            }
            dto.setUserNickname(nicknames.get(dto.getUserId()));
            List<String> tags = roleTags.get(dto.getUserId());
            dto.setRoleTags(tags == null || tags.isEmpty() ? null : String.join(",", tags));
        }
    }

    /** 批量取用户的角色标签名（只要 is_role=1 的） */
    private Map<Long, List<String>> loadRoleTagsByUserIds(List<Long> userIds) {
        List<Long> roleTagIds = roleTagIds();
        if (roleTagIds.isEmpty()) {
            return Map.of();
        }
        com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<UserMemberTag> qw =
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<>();
        qw.select("user_id AS userId", "tag_id AS tagId")
                .in("user_id", userIds)
                .in("tag_id", roleTagIds);
        Map<Long, List<Long>> userToTagIds = new HashMap<>();
        for (Map<String, Object> row : userMemberTagMapper.selectMaps(qw)) {
            Object uid = row.get("userId");
            Object tid = row.get("tagId");
            if (uid instanceof Number && tid instanceof Number) {
                userToTagIds.computeIfAbsent(((Number) uid).longValue(), k -> new ArrayList<>())
                        .add(((Number) tid).longValue());
            }
        }
        if (userToTagIds.isEmpty()) {
            return Map.of();
        }
        List<Long> allTagIds = userToTagIds.values().stream()
                .flatMap(List::stream).distinct().collect(Collectors.toList());
        com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<MemberTag> tw =
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<>();
        tw.select("id", "name").in("id", allTagIds);
        Map<Long, String> tagNames = new HashMap<>();
        for (Map<String, Object> row : memberTagMapper.selectMaps(tw)) {
            Object id = row.get("id");
            if (id instanceof Number) {
                tagNames.put(((Number) id).longValue(), String.valueOf(row.get("name")));
            }
        }
        Map<Long, List<String>> result = new HashMap<>();
        userToTagIds.forEach((uid, tagIds) -> {
            List<String> names = tagIds.stream()
                    .map(tagNames::get)
                    .filter(java.util.Objects::nonNull)
                    .collect(Collectors.toList());
            if (!names.isEmpty()) {
                result.put(uid, names);
            }
        });
        return result;
    }

    private List<Long> roleTagIds() {
        List<MemberTag> roleTags = memberTagMapper.selectList(
                new LambdaQueryWrapper<MemberTag>().eq(MemberTag::getIsRole, 1));
        return roleTags.stream().map(MemberTag::getId).collect(Collectors.toList());
    }

    /** 批量填「关联内容数 / 关联商品数」，两次 group by 查询搞定，不做 N+1 */
    private void fillCounts(List<AuthorDTO> list) {
        if (list == null || list.isEmpty()) {
            return;
        }
        List<Long> ids = list.stream().map(AuthorDTO::getId).filter(java.util.Objects::nonNull).collect(Collectors.toList());
        if (ids.isEmpty()) {
            return;
        }
        Map<Long, Integer> contentCounts = countContentsByAuthor(ids);
        Map<Long, Integer> productCounts = countProductsByAuthor(ids);
        for (AuthorDTO dto : list) {
            dto.setContentCount(contentCounts.getOrDefault(dto.getId(), 0));
            dto.setProductCount(productCounts.getOrDefault(dto.getId(), 0));
        }
    }

    private Map<Long, Integer> countContentsByAuthor(List<Long> ids) {
        com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<Content> qw =
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<>();
        qw.select("author_id AS authorId", "COUNT(*) AS cnt")
                .in("author_id", ids)
                .groupBy("author_id");
        return toCountMap(contentMapper.selectMaps(qw));
    }

    private Map<Long, Integer> countProductsByAuthor(List<Long> ids) {
        com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<Product> qw =
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<>();
        qw.select("author_id AS authorId", "COUNT(*) AS cnt")
                .in("author_id", ids)
                .groupBy("author_id");
        return toCountMap(productMapper.selectMaps(qw));
    }

    private Map<Long, Integer> toCountMap(List<Map<String, Object>> rows) {
        Map<Long, Integer> result = new HashMap<>();
        if (rows == null) {
            return result;
        }
        for (Map<String, Object> row : rows) {
            Object aid = row.get("authorId");
            Object cnt = row.get("cnt");
            if (aid instanceof Number && cnt instanceof Number) {
                result.put(((Number) aid).longValue(), ((Number) cnt).intValue());
            }
        }
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AuthorDTO createAuthor(AuthorDTO dto) {
        Author entity = new Author();
        BeanUtils.copyProperties(dto, entity);
        if (!StringUtils.hasText(entity.getRole())) {
            entity.setRole("editor");
        }
        entity.setTags(normalizeTags(entity.getTags()));
        if (entity.getSortOrder() == null) {
            entity.setSortOrder(0);
        }
        if (entity.getStatus() == null) {
            entity.setStatus(1);
        }
        assertUserLinkAvailable(entity.getUserId(), null);
        this.save(entity);
        syncCreatorRole(entity);
        return toDTO(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AuthorDTO updateAuthor(Long id, AuthorDTO dto) {
        Author entity = getExistingAuthor(id);

        if (dto.getName() != null) {
            entity.setName(dto.getName());
        }
        if (dto.getAvatarUrl() != null) {
            entity.setAvatarUrl(dto.getAvatarUrl());
        }
        if (dto.getRole() != null) {
            entity.setRole(dto.getRole());
        }
        if (dto.getTitle() != null) {
            entity.setTitle(dto.getTitle());
        }
        if (dto.getTags() != null) {
            entity.setTags(normalizeTags(dto.getTags()));
        }
        if (dto.getIntro() != null) {
            entity.setIntro(dto.getIntro());
        }
        if (dto.getContact() != null) {
            entity.setContact(dto.getContact());
        }
        if (dto.getSortOrder() != null) {
            entity.setSortOrder(dto.getSortOrder());
        }
        if (dto.getStatus() != null) {
            entity.setStatus(dto.getStatus());
        }
        // userId 允许显式传 null 来「解绑」，所以不能判 null 就跳过；
        // 用 dto.isUserIdPresent() 区分「JSON 里没这个字段」与「显式传了 null」
        if (dto.isUserIdPresent()) {
            if (!java.util.Objects.equals(dto.getUserId(), entity.getUserId())) {
                assertUserLinkAvailable(dto.getUserId(), id);
                entity.setUserId(dto.getUserId());
            }
        }
        this.updateById(entity);
        syncCreatorRole(entity);
        return toDTO(entity);
    }

    /** 一个用户只能被一位作者档案关联（uk_author_user_id），这里给出可读报错 */
    private void assertUserLinkAvailable(Long userId, Long selfAuthorId) {
        if (userId == null) {
            return;
        }
        Author exists = this.getOne(new LambdaQueryWrapper<Author>()
                .eq(Author::getUserId, userId)
                .last("LIMIT 1"));
        if (exists != null && !exists.getId().equals(selfAuthorId)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR,
                    "该用户已关联作者档案「" + exists.getName() + "」，请先在原档案上解除关联");
        }
    }

    /**
     * 作者接了用户后，把角色同步到 mp_user.creator_role。
     * 这是 V62 就建好但一直没人用的字段：用户管理列表在没有角色标签时，
     * 靠 creator_role 也能显示出「主理人/编辑/特约作者」。
     * 只在该用户 creator_role 为空时写，不覆盖运营手工设置过的值。
     */
    private void syncCreatorRole(Author author) {
        Long userId = author.getUserId();
        if (userId == null || !StringUtils.hasText(author.getRole())) {
            return;
        }
        User user = userMapper.selectById(userId);
        if (user == null) {
            return;
        }
        if (!StringUtils.hasText(user.getCreatorRole())) {
            user.setCreatorRole(author.getRole());
            userMapper.updateById(user);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteAuthor(Long id) {
        getExistingAuthor(id);

        // 被内容引用时禁止删除（避免拉黑历史文章作者档案）
        long contentCount = contentMapper.selectCount(
                new LambdaQueryWrapper<Content>().eq(Content::getAuthorId, id));
        if (contentCount > 0) {
            throw new BusinessException(ErrorCode.PARAM_ERROR,
                    "该作者已被 " + contentCount + " 篇内容引用，请先停用或转移内容后再删除");
        }

        // 被商品/专栏引用时同样禁止删除
        long productCount = productMapper.selectCount(
                new LambdaQueryWrapper<Product>().eq(Product::getAuthorId, id));
        if (productCount > 0) {
            throw new BusinessException(ErrorCode.PARAM_ERROR,
                    "该作者已被 " + productCount + " 个商品/专栏引用，请先停用或转移后再删除");
        }

        this.removeById(id);
    }

    @Override
    public AuthorDTO getAuthorById(Long id) {
        if (id == null) {
            return null;
        }
        Author entity = this.getById(id);
        return entity != null ? toDTO(entity) : null;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int linkContents(Long authorId) {
        Author author = getExistingAuthor(authorId);
        if (!StringUtils.hasText(author.getName())) {
            return 0;
        }
        // 找出 author_id 为空、author 名字完全匹配的历史内容
        // （MyBatis-Plus 逻辑删除会自动加 deleted=0 条件，无需手写）
        LambdaQueryWrapper<Content> wrapper = new LambdaQueryWrapper<Content>()
                .isNull(Content::getAuthorId)
                .eq(Content::getAuthor, author.getName());
        List<Content> contents = contentMapper.selectList(wrapper);
        if (contents.isEmpty()) {
            return 0;
        }
        for (Content c : contents) {
            c.setAuthorId(authorId);
            // 仅回填空缺字段，已有值不覆盖
            if (!StringUtils.hasText(c.getAuthorAvatar()) && StringUtils.hasText(author.getAvatarUrl())) {
                c.setAuthorAvatar(author.getAvatarUrl());
            }
            if (!StringUtils.hasText(c.getAuthorRole()) && StringUtils.hasText(author.getRole())) {
                c.setAuthorRole(author.getRole());
            }
            contentMapper.updateById(c);
        }
        log.info("作者档案 {} 关联历史内容 {} 条", authorId, contents.size());
        return contents.size();
    }

    // ==================== 私有方法 ====================

    /**
     * 标签归一化：拆分逗号 → trim → 去空 → 去重 → 排序 → 重新拼。
     * 必须排序，否则同一组标签因录入顺序不同会有多种写法，
     * FIND_IN_SET 虽不受影响，但后台按标签聚合统计会散成多组。
     * 单个标签长度上限 32，防止有人把整段简介粘进来。
     */
    private String normalizeTags(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        String[] parts = raw.split("[,，]");
        List<String> tags = new ArrayList<>();
        for (String part : parts) {
            String t = part.trim();
            if (t.isEmpty()) {
                continue;
            }
            if (t.length() > 32) {
                t = t.substring(0, 32);
            }
            if (!tags.contains(t)) {
                tags.add(t);
            }
        }
        if (tags.isEmpty()) {
            return null;
        }
        java.util.Collections.sort(tags);
        String joined = String.join(",", tags);
        return joined.length() > 255 ? joined.substring(0, 255) : joined;
    }

    /**
     * 首页作者区块「动态聚合」模式专用查询（V122）。
     *
     * 与 {@link #listAuthors} 的区别：
     *   - 只返回启用（status=1）未删除的档案
     *   - 支持按标签多选筛选（命中任一标签即入选，OR 语义）
     *   - 支持三种排序：weight=sort_order 升序、latest=create_time 倒序、article_count=内容+专栏数倒序
     *   - 返回值额外带 homePath，省得小程序端各自拼路径（拼错就是 404）
     *
     * 标签筛选用 FIND_IN_SET 而不是 LIKE：LIKE '%官方主理人%' 会把'官方主理人plus' 一并命中。
     */
    @Override
    public List<AuthorDTO> listAuthorsForAggregation(List<String> tags, String sortBy, Integer limit) {
        int max = limit == null || limit <= 0 ? 5 : Math.min(limit, 8);
        LambdaQueryWrapper<Author> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Author::getStatus, 1);
        if (tags != null && !tags.isEmpty()) {
            // OR 语义：任一标签命中即可。tags 逐个 AND FIND_IN_SET。
            StringBuilder sql = new StringBuilder();
            for (int i = 0; i < tags.size(); i++) {
                String t = tags.get(i) == null ? "" : tags.get(i).trim();
                if (t.isEmpty()) {
                    continue;
                }
                sql.append(i == 0 ? "" : " OR ").append("FIND_IN_SET('")
                        .append(t.replace("'", "''")).append("', tags) > 0");
            }
            if (sql.length() > 0) {
                wrapper.apply(sql.toString());
            }
        }
        String sort = sortBy == null ? "weight" : sortBy.trim();
        if ("latest".equals(sort)) {
            wrapper.orderByDesc(Author::getCreateTime).orderByDesc(Author::getId);
        } else if ("article_count".equals(sort)) {
            // 内容/专栏数在库里没有字段，先按权重兜底排序，取数后Java 侧重排（见下方）
            wrapper.orderByAsc(Author::getSortOrder).orderByAsc(Author::getId);
        } else {
            wrapper.orderByAsc(Author::getSortOrder).orderByAsc(Author::getId);
        }
        List<AuthorDTO> list = this.list(wrapper).stream().map(this::toDTO).collect(Collectors.toList());
        fillCounts(list);
        if ("article_count".equals(sort)) {
            // 内容数 + 专栏数倒序；同数时按 sort_order 升序保持稳定
            list.sort((a, b) -> {
                int ca = nvl(a.getContentCount()) + nvl(a.getProductCount());
                int cb = nvl(b.getContentCount()) + nvl(b.getProductCount());
                if (ca != cb) {
                    return cb - ca;
                }
                int sa = a.getSortOrder() == null ? 0 : a.getSortOrder();
                int sb = b.getSortOrder() == null ? 0 : b.getSortOrder();
                return Integer.compare(sa, sb);
            });
        }
        if (list.size() > max) {
            return new ArrayList<>(list.subList(0, max));
        }
        return list;
    }

    private int nvl(Integer v) {
        return v == null ? 0 : v;
    }

    private Author getExistingAuthor(Long id) {
        Author entity = this.getById(id);
        if (entity == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "作者不存在");
        }
        return entity;
    }

    private AuthorDTO toDTO(Author entity) {
        AuthorDTO dto = new AuthorDTO();
        BeanUtils.copyProperties(entity, dto);
        return dto;
    }
}