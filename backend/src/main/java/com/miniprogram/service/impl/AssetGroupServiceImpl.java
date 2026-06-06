package com.miniprogram.service.impl;

import com.miniprogram.common.BusinessException;
import com.miniprogram.dto.AssetGroupDTO;
import com.miniprogram.dto.AssetGroupVO;
import com.miniprogram.entity.AssetGroup;
import com.miniprogram.mapper.AssetGroupMapper;
import com.miniprogram.service.AssetGroupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AssetGroupServiceImpl extends BaseServiceImpl<AssetGroupMapper, AssetGroup> implements AssetGroupService {

    @Override
    public List<AssetGroupVO> listGroups() {
        return this.list().stream().map(this::toVO).toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AssetGroupVO createGroup(AssetGroupDTO dto) {
        AssetGroup group = new AssetGroup();
        BeanUtils.copyProperties(dto, group);
        this.save(group);
        return toVO(group);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AssetGroupVO updateGroup(Long id, AssetGroupDTO dto) {
        AssetGroup group = getExistingGroup(id);
        if (dto.getName() != null) {
            group.setName(dto.getName());
        }
        if (dto.getSortOrder() != null) {
            group.setSortOrder(dto.getSortOrder());
        }
        this.updateById(group);
        return toVO(group);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteGroup(Long id) {
        getExistingGroup(id);
        this.removeById(id);
    }

    private AssetGroup getExistingGroup(Long id) {
        AssetGroup group = this.getById(id);
        if (group == null) {
            throw new BusinessException(4001, "素材分组不存在");
        }
        return group;
    }

    private AssetGroupVO toVO(AssetGroup entity) {
        AssetGroupVO vo = new AssetGroupVO();
        BeanUtils.copyProperties(entity, vo);
        return vo;
    }
}
