package com.miniprogram.service;

import com.miniprogram.dto.AssetGroupDTO;
import com.miniprogram.dto.AssetGroupVO;
import com.miniprogram.entity.AssetGroup;

import java.util.List;

public interface AssetGroupService extends BaseService<AssetGroup> {
    List<AssetGroupVO> listGroups();
    AssetGroupVO createGroup(AssetGroupDTO dto);
    AssetGroupVO updateGroup(Long id, AssetGroupDTO dto);
    void deleteGroup(Long id);
}
