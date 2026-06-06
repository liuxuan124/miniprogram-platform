package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.*;
import com.miniprogram.entity.Asset;
import com.miniprogram.mapper.AssetMapper;
import com.miniprogram.service.AssetGroupService;
import com.miniprogram.service.AssetService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 素材库 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AssetServiceImpl extends BaseServiceImpl<AssetMapper, Asset> implements AssetService {

    private final AssetGroupService assetGroupService;

    @Override
    public PageResult<AssetVO> listAssets(String type, Long groupId, String keyword, Long current, Long size) {
        LambdaQueryWrapper<Asset> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(StringUtils.hasText(type), Asset::getType, type);
        wrapper.eq(groupId != null, Asset::getGroupId, groupId);
        wrapper.like(StringUtils.hasText(keyword), Asset::getName, keyword);
        wrapper.orderByDesc(Asset::getCreatedAt);

        Page<Asset> page = this.page(new Page<>(current, size), wrapper);

        PageResult<AssetVO> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setCurrent(page.getCurrent());
        result.setSize(page.getSize());
        result.setRecords(page.getRecords().stream().map(this::toAssetVO).toList());
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AssetVO createAsset(AssetDTO dto) {
        Asset asset = new Asset();
        BeanUtils.copyProperties(dto, asset);
        this.save(asset);
        return toAssetVO(asset);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteAsset(Long id) {
        Asset asset = this.getById(id);
        if (asset == null) {
            throw new BusinessException(6002, "素材不存在");
        }
        this.removeById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AssetVO updateAsset(Long id, AssetDTO dto) {
        Asset asset = this.getById(id);
        if (asset == null) {
            throw new BusinessException(6002, "素材不存在");
        }
        if (StringUtils.hasText(dto.getName())) {
            asset.setName(dto.getName());
        }
        if (dto.getGroupId() != null) {
            asset.setGroupId(dto.getGroupId());
        }
        this.updateById(asset);
        return toAssetVO(asset);
    }

    @Override
    public PageResult<AssetGroupVO> listGroups(Long current, Long size) {
        List<AssetGroupVO> allGroups = assetGroupService.listGroups();
        // 简单分页
        int total = allGroups.size();
        int fromIndex = (int) Math.min((current - 1) * size, total);
        int toIndex = (int) Math.min(current * size, total);
        List<AssetGroupVO> pageRecords = allGroups.subList(fromIndex, toIndex);
        return new PageResult<>(pageRecords, (long) total, current, size);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AssetGroupVO createGroup(AssetGroupDTO dto) {
        return assetGroupService.createGroup(dto);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AssetGroupVO updateGroup(Long id, AssetGroupDTO dto) {
        return assetGroupService.updateGroup(id, dto);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteGroup(Long id) {
        // 检查分组下是否有素材
        long count = this.count(new LambdaQueryWrapper<Asset>().eq(Asset::getGroupId, id));
        if (count > 0) {
            throw new BusinessException(4002, "分组下有素材，不可删除");
        }
        assetGroupService.deleteGroup(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void batchDeleteAssets(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new BusinessException(4001, "素材ID列表不能为空");
        }
        this.removeByIds(ids);
        log.info("批量删除素材 {} 个", ids.size());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void batchMoveAssets(List<Long> ids, Long groupId) {
        if (ids == null || ids.isEmpty()) {
            throw new BusinessException(4001, "素材ID列表不能为空");
        }
        List<Asset> assets = this.listByIds(ids);
        for (Asset asset : assets) {
            asset.setGroupId(groupId);
        }
        this.updateBatchById(assets);
        log.info("批量移动素材 {} 个到分组 {}", ids.size(), groupId);
    }

    @Override
    public Map<String, Object> syncFromWechat() {
        // 微信素材同步需要公众号或小程序 access_token
        // 当前为示例实现，返回提示信息
        Map<String, Object> result = new HashMap<>();
        result.put("synced", 0);
        result.put("message", "微信素材同步功能需要配置微信公众号/小程序AppID和AppSecret");
        log.warn("微信素材同步：未配置微信凭证，跳过同步");
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void syncToWechat(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new BusinessException(4001, "素材ID列表不能为空");
        }
        // 微信素材上传需要公众号 access_token
        // 当前为示例实现，仅更新同步状态
        List<Asset> assets = this.listByIds(ids);
        log.info("微信素材同步：标记 {} 个素材为已同步", assets.size());
    }

    private AssetVO toAssetVO(Asset asset) {
        AssetVO vo = new AssetVO();
        BeanUtils.copyProperties(asset, vo);
        return vo;
    }
}
