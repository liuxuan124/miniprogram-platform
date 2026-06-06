package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.AssetDTO;
import com.miniprogram.dto.AssetGroupDTO;
import com.miniprogram.dto.AssetGroupVO;
import com.miniprogram.dto.AssetVO;
import com.miniprogram.entity.Asset;
import com.miniprogram.entity.AssetGroup;

import java.util.List;
import java.util.Map;

/**
 * 素材库 Service
 */
public interface AssetService extends BaseService<Asset> {

    /**
     * 分页查询素材列表
     */
    PageResult<AssetVO> listAssets(String type, Long groupId, String keyword, Long current, Long size);

    /**
     * 上传素材
     */
    AssetVO createAsset(AssetDTO dto);

    /**
     * 删除素材
     */
    void deleteAsset(Long id);

    /**
     * 更新素材信息
     */
    AssetVO updateAsset(Long id, AssetDTO dto);

    /**
     * 获取素材分组列表
     */
    PageResult<AssetGroupVO> listGroups(Long current, Long size);

    /**
     * 创建素材分组
     */
    AssetGroupVO createGroup(AssetGroupDTO dto);

    /**
     * 更新素材分组
     */
    AssetGroupVO updateGroup(Long id, AssetGroupDTO dto);

    /**
     * 删除素材分组
     */
    void deleteGroup(Long id);

    /**
     * 批量删除素材
     */
    void batchDeleteAssets(List<Long> ids);

    /**
     * 批量移动素材
     */
    void batchMoveAssets(List<Long> ids, Long groupId);

    /**
     * 从微信后台同步素材到本地
     */
    Map<String, Object> syncFromWechat();

    /**
     * 同步本地素材到微信后台
     */
    void syncToWechat(List<Long> ids);
}
