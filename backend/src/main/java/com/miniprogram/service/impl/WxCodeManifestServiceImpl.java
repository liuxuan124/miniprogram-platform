package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.entity.MpWxCodeManifest;
import com.miniprogram.mapper.MpWxCodeManifestMapper;
import com.miniprogram.service.WxCodeManifestService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class WxCodeManifestServiceImpl implements WxCodeManifestService {

    private final MpWxCodeManifestMapper manifestMapper;
    private final ObjectMapper objectMapper;

    @Override
    public void register(Long tenantId, String wxVersion, Map<String, Object> manifest) {
        if (tenantId == null) {
            tenantId = 0L;
        }
        if (!StringUtils.hasText(wxVersion)) {
            throw new BusinessException(400, "wxVersion 不能为空");
        }
        if (manifest == null || manifest.isEmpty()) {
            throw new BusinessException(400, "manifest 不能为空");
        }
        String json;
        try {
            json = objectMapper.writeValueAsString(manifest);
        } catch (Exception e) {
            throw new BusinessException(400, "manifest 无法序列化");
        }
        MpWxCodeManifest existing = manifestMapper.selectOne(new LambdaQueryWrapper<MpWxCodeManifest>()
                .eq(MpWxCodeManifest::getTenantId, tenantId)
                .eq(MpWxCodeManifest::getWxVersion, wxVersion.trim())
                .last("LIMIT 1"));
        if (existing != null) {
            existing.setManifestJson(json);
            existing.setCreatedAt(LocalDateTime.now());
            manifestMapper.updateById(existing);
            return;
        }
        MpWxCodeManifest row = new MpWxCodeManifest();
        row.setTenantId(tenantId);
        row.setWxVersion(wxVersion.trim());
        row.setManifestJson(json);
        row.setCreatedAt(LocalDateTime.now());
        manifestMapper.insert(row);
    }

    @Override
    public Optional<Map<String, Object>> getLatestManifest(Long tenantId) {
        if (tenantId == null) {
            tenantId = 0L;
        }
        MpWxCodeManifest row = manifestMapper.selectOne(new LambdaQueryWrapper<MpWxCodeManifest>()
                .eq(MpWxCodeManifest::getTenantId, tenantId)
                .orderByDesc(MpWxCodeManifest::getCreatedAt)
                .last("LIMIT 1"));
        if (row == null || !StringUtils.hasText(row.getManifestJson())) {
            return Optional.empty();
        }
        try {
            Map<String, Object> map = objectMapper.readValue(row.getManifestJson(), new TypeReference<>() {});
            return Optional.of(map);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    @Override
    public Set<String> supportedComponentTypes(Long tenantId) {
        Optional<Map<String, Object>> manifest = getLatestManifest(tenantId);
        if (manifest.isEmpty()) {
            return Set.of();
        }
        Object raw = manifest.get().get("supported_component_types");
        if (raw instanceof List<?> list) {
            Set<String> out = new LinkedHashSet<>();
            for (Object o : list) {
                if (o != null && StringUtils.hasText(String.valueOf(o))) {
                    out.add(String.valueOf(o).trim());
                }
            }
            return out;
        }
        return Set.of();
    }

    @Override
    public void appendManifestWarnings(List<String> warnings, Long tenantId) {
        if (getLatestManifest(tenantId).isEmpty()) {
            warnings.add("尚未登记微信代码包能力清单（capabilities.json），组件兼容性仅作后台校验参考");
        }
    }
}
