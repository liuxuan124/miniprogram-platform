package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.dto.AuthorDTO;
import com.miniprogram.entity.Author;
import com.miniprogram.entity.Content;
import com.miniprogram.entity.Product;
import com.miniprogram.mapper.AuthorMapper;
import com.miniprogram.mapper.ContentMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.service.AuthorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

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

    @Override
    public List<AuthorDTO> listAuthors(Integer status) {
        LambdaQueryWrapper<Author> wrapper = new LambdaQueryWrapper<>();
        if (status != null) {
            wrapper.eq(Author::getStatus, status);
        }
        wrapper.orderByAsc(Author::getSortOrder).orderByAsc(Author::getId);
        List<AuthorDTO> list = this.list(wrapper).stream().map(this::toDTO).collect(Collectors.toList());
        fillCounts(list);
        return list;
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
        if (entity.getSortOrder() == null) {
            entity.setSortOrder(0);
        }
        if (entity.getStatus() == null) {
            entity.setStatus(1);
        }
        this.save(entity);
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
        this.updateById(entity);

        return toDTO(entity);
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