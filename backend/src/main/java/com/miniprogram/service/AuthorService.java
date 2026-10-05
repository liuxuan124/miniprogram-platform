package com.miniprogram.service;

import com.miniprogram.dto.AuthorDTO;

import java.util.List;

/**
 * 作者档案 Service
 */
public interface AuthorService {

    /** 列出全部作者（按 sort_order 升序）；status/role/userId/keyword 可选筛选 */
    List<AuthorDTO> listAuthors(Integer status, String role, Long userId, String keyword);

    /**
     * 首页作者区块「动态聚合」模式查询（V122）。
     * 只返回启用档案；tags 非空时按标签多选筛选（OR 语义，命中任一即入选）；
     * sortBy 支持 weight(默认，sort_order 升序) / latest(create_time 倒序) /
     * article_count(内容+专栏数倒序)；limit 收敛到 3~8。
     */
    List<AuthorDTO> listAuthorsForAggregation(List<String> tags, String sortBy, Integer limit);

    /** 创建作者 */
    AuthorDTO createAuthor(AuthorDTO dto);

    /** 更新作者 */
    AuthorDTO updateAuthor(Long id, AuthorDTO dto);

    /** 删除作者（被内容引用时禁止删除） */
    void deleteAuthor(Long id);

    /** 根据 ID 取单个作者；不存在返回 null（用于内容发布回填） */
    AuthorDTO getAuthorById(Long id);

    /**
     * 批量关联历史内容：把 author_id 为空且 author 名字匹配该作者昵称的内容
     * 全部关联到该档案，并对空缺的 author_avatar/author_role 做回填。
     * 返回关联条数。
     */
    int linkContents(Long authorId);
}