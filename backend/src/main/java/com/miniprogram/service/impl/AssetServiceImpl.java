package com.miniprogram.service.impl;

import cn.hutool.http.HttpUtil;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.*;
import com.miniprogram.dto.system.UploadResultVO;
import com.miniprogram.entity.Asset;
import com.miniprogram.mapper.AssetMapper;
import com.miniprogram.service.AssetGroupService;
import com.miniprogram.service.AssetService;
import com.miniprogram.service.FileUploadService;
import com.miniprogram.service.WeChatOfficialAccountClient;
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

    private static final int SYNC_PAGE_SIZE = 20;
    private static final int SYNC_MAX_ITEMS = 200;

    private final AssetGroupService assetGroupService;
    private final WeChatOfficialAccountClient weChatOfficialAccountClient;
    private final FileUploadService fileUploadService;

    @Override
    public PageResult<AssetVO> listAssets(String type, Long groupId, String keyword, Long current, Long size) {
        LambdaQueryWrapper<Asset> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(StringUtils.hasText(type), Asset::getType, type);
        if (groupId != null && groupId == -1L) {
            wrapper.and(w -> w.isNull(Asset::getGroupId).or().eq(Asset::getGroupId, 0L));
        } else if (groupId != null) {
            wrapper.eq(Asset::getGroupId, groupId);
        }
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
        for (AssetGroupVO vo : allGroups) {
            long count = this.count(new LambdaQueryWrapper<Asset>().eq(Asset::getGroupId, vo.getId()));
            vo.setCount(count);
        }
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
        Map<String, Object> result = new HashMap<>();
        int synced = 0;
        int skipped = 0;
        int failed = 0;

        // 先校验凭证（未配置会抛明确错误，不再返回假提示）
        weChatOfficialAccountClient.getAccessToken();

        int offset = 0;
        int totalCount = Integer.MAX_VALUE;
        while (offset < totalCount && synced + skipped + failed < SYNC_MAX_ITEMS) {
            JSONObject page = weChatOfficialAccountClient.batchGetMaterials("image", offset, SYNC_PAGE_SIZE);
            totalCount = page.getInt("total_count", 0);
            JSONArray items = page.getJSONArray("item");
            int itemCount = page.getInt("item_count", items == null ? 0 : items.size());
            if (items == null || items.isEmpty()) {
                break;
            }
            for (int i = 0; i < items.size(); i++) {
                JSONObject item = items.getJSONObject(i);
                if (item == null) {
                    continue;
                }
                try {
                    if (importWechatImage(item)) {
                        synced++;
                    } else {
                        skipped++;
                    }
                } catch (Exception e) {
                    failed++;
                    log.warn("同步微信素材失败 mediaId={}: {}", item.getStr("media_id"), e.getMessage());
                }
            }
            if (itemCount <= 0) {
                break;
            }
            offset += itemCount;
            if (offset >= totalCount) {
                break;
            }
        }

        result.put("synced", synced);
        result.put("skipped", skipped);
        result.put("failed", failed);
        result.put("totalOnWechat", totalCount == Integer.MAX_VALUE ? 0 : totalCount);
        result.put("message", String.format("已同步 %d 个，跳过 %d 个，失败 %d 个", synced, skipped, failed));
        log.info("微信素材同步完成 synced={} skipped={} failed={}", synced, skipped, failed);
        return result;
    }

    /**
     * @return true 新建；false 已存在跳过
     */
    private boolean importWechatImage(JSONObject item) {
        String mediaId = item.getStr("media_id");
        String name = item.getStr("name");
        if (!StringUtils.hasText(name)) {
            name = StringUtils.hasText(mediaId) ? mediaId : "wechat-image";
        }
        // 同名已存在则跳过（避免重复入库）
        long exists = this.count(new LambdaQueryWrapper<Asset>()
                .eq(Asset::getName, name)
                .eq(Asset::getType, "image"));
        if (exists > 0) {
            return false;
        }

        byte[] bytes = weChatOfficialAccountClient.downloadPermanentImage(mediaId);
        if (bytes == null || bytes.length == 0) {
            // 部分素材返回微信 CDN url，可直接下载
            String remoteUrl = item.getStr("url");
            if (StringUtils.hasText(remoteUrl)) {
                bytes = HttpUtil.downloadBytes(remoteUrl);
            }
        }
        if (bytes == null || bytes.length == 0) {
            throw new BusinessException(6003, "无法下载素材: " + name);
        }

        String fileName = name.contains(".") ? name : name + ".jpg";
        UploadResultVO uploaded = fileUploadService.uploadBytes(bytes, fileName, "wechat-material");

        Asset asset = new Asset();
        asset.setName(name);
        asset.setType("image");
        asset.setUrl(uploaded.getUrl());
        asset.setThumbUrl(uploaded.getUrl());
        asset.setSize(uploaded.getFileSize() != null ? uploaded.getFileSize() : (long) bytes.length);
        this.save(asset);
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void syncToWechat(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new BusinessException(4001, "素材ID列表不能为空");
        }
        List<Asset> assets = this.listByIds(ids);
        log.info("同步到微信尚未实现，已选 {} 个素材", assets.size());
    }

    private AssetVO toAssetVO(Asset asset) {
        AssetVO vo = new AssetVO();
        BeanUtils.copyProperties(asset, vo);
        return vo;
    }
}
