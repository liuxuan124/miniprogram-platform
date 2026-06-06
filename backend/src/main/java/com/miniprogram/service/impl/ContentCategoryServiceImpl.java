package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.dto.ContentCategoryDTO;
import com.miniprogram.entity.Content;
import com.miniprogram.entity.ContentCategory;
import com.miniprogram.mapper.ContentCategoryMapper;
import com.miniprogram.mapper.ContentMapper;
import com.miniprogram.service.ContentCategoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 内容分类 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContentCategoryServiceImpl extends BaseServiceImpl<ContentCategoryMapper, ContentCategory>
        implements ContentCategoryService {

    private final ContentMapper contentMapper;

    @Override
    public List<ContentCategoryDTO> listCategoryTree() {
        List<ContentCategory> allCategories = this.lambdaQuery()
                .orderByAsc(ContentCategory::getSortOrder)
                .list();

        List<ContentCategoryDTO> dtoList = allCategories.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());

        // 构建树形结构
        return buildTree(dtoList);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ContentCategoryDTO createCategory(ContentCategoryDTO dto) {
        // 校验父分类是否存在
        if (dto.getParentId() != null && dto.getParentId() > 0) {
            ContentCategory parent = this.getById(dto.getParentId());
            if (parent == null) {
                throw new BusinessException(ErrorCode.CONTENT_CATEGORY_NOT_FOUND);
            }
        }

        ContentCategory entity = new ContentCategory();
        BeanUtils.copyProperties(dto, entity);
        if (entity.getParentId() == null) {
            entity.setParentId(0L);
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
    public ContentCategoryDTO updateCategory(Long id, ContentCategoryDTO dto) {
        ContentCategory entity = getExistingCategory(id);

        if (dto.getName() != null) {
            entity.setName(dto.getName());
        }
        if (dto.getParentId() != null) {
            // 不允许将自己设为父分类
            if (dto.getParentId().equals(id)) {
                throw new BusinessException(ErrorCode.PARAM_ERROR, "不能将自己设为父分类");
            }
            entity.setParentId(dto.getParentId());
        }
        if (dto.getSortOrder() != null) {
            entity.setSortOrder(dto.getSortOrder());
        }
        if (dto.getIcon() != null) {
            entity.setIcon(dto.getIcon());
        }
        if (dto.getStatus() != null) {
            entity.setStatus(dto.getStatus());
        }
        this.updateById(entity);

        return toDTO(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteCategory(Long id) {
        getExistingCategory(id);

        // 检查分类下是否有内容
        long contentCount = contentMapper.selectCount(
                new LambdaQueryWrapper<Content>().eq(Content::getCategoryId, id));
        if (contentCount > 0) {
            throw new BusinessException(ErrorCode.CONTENT_CATEGORY_HAS_CONTENT);
        }

        // 检查是否有子分类
        long childCount = this.count(
                new LambdaQueryWrapper<ContentCategory>().eq(ContentCategory::getParentId, id));
        if (childCount > 0) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "该分类下有子分类，不可删除");
        }

        this.removeById(id);
    }

    @Override
    public String getCategoryName(Long categoryId) {
        if (categoryId == null) {
            return null;
        }
        ContentCategory category = this.getById(categoryId);
        return category != null ? category.getName() : null;
    }

    // ==================== 私有方法 ====================

    private ContentCategory getExistingCategory(Long id) {
        ContentCategory entity = this.getById(id);
        if (entity == null) {
            throw new BusinessException(ErrorCode.CONTENT_CATEGORY_NOT_FOUND);
        }
        return entity;
    }

    private ContentCategoryDTO toDTO(ContentCategory entity) {
        ContentCategoryDTO dto = new ContentCategoryDTO();
        BeanUtils.copyProperties(entity, dto);
        return dto;
    }

    private List<ContentCategoryDTO> buildTree(List<ContentCategoryDTO> dtoList) {
        Map<Long, ContentCategoryDTO> map = dtoList.stream()
                .collect(Collectors.toMap(ContentCategoryDTO::getId, dto -> dto));

        List<ContentCategoryDTO> roots = new ArrayList<>();
        for (ContentCategoryDTO dto : dtoList) {
            if (dto.getParentId() == null || dto.getParentId() == 0) {
                roots.add(dto);
            } else {
                ContentCategoryDTO parent = map.get(dto.getParentId());
                if (parent != null) {
                    if (parent.getChildren() == null) {
                        parent.setChildren(new ArrayList<>());
                    }
                    parent.getChildren().add(dto);
                } else {
                    // 父分类不存在，作为顶级节点
                    roots.add(dto);
                }
            }
        }
        return roots;
    }
}
