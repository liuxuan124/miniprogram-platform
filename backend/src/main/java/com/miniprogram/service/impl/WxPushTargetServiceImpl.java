package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.dto.miniapp.WxPushTargetDTO;
import com.miniprogram.entity.WxPushTarget;
import com.miniprogram.mapper.WxPushTargetMapper;
import com.miniprogram.service.SystemConfigService;
import com.miniprogram.service.WxPushTargetService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class WxPushTargetServiceImpl implements WxPushTargetService {

    private final WxPushTargetMapper wxPushTargetMapper;
    private final SystemConfigService systemConfigService;

    @Value("${wx.miniapp.appid:}")
    private String defaultAppId;

    @Value("${wx.miniapp.upload-key:}")
    private String defaultUploadKey;

    @Override
    public List<WxPushTarget> listEnabled() {
        List<WxPushTarget> list = wxPushTargetMapper.selectList(new LambdaQueryWrapper<WxPushTarget>()
                .eq(WxPushTarget::getStatus, 1)
                .orderByDesc(WxPushTarget::getIsDefault)
                .orderByAsc(WxPushTarget::getId));
        list.forEach(this::maskForClient);
        return list;
    }

    @Override
    public List<WxPushTarget> listAll() {
        List<WxPushTarget> list = wxPushTargetMapper.selectList(new LambdaQueryWrapper<WxPushTarget>()
                .orderByDesc(WxPushTarget::getIsDefault)
                .orderByAsc(WxPushTarget::getId));
        list.forEach(this::maskForClient);
        return list;
    }

    @Override
    public WxPushTarget getById(Long id) {
        WxPushTarget target = wxPushTargetMapper.selectById(id);
        BusinessException.throwIf(target == null, ErrorCode.DATA_NOT_FOUND.getCode(), "推送目标不存在");
        maskForClient(target);
        return target;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public WxPushTarget create(WxPushTargetDTO dto) {
        assertAppIdUnique(dto.getAppId().trim(), null);
        WxPushTarget target = new WxPushTarget();
        applyDto(target, dto, true);
        if (Boolean.TRUE.equals(dto.getIsDefault()) || countEnabled() == 0) {
            clearDefaults();
            target.setIsDefault(1);
        }
        wxPushTargetMapper.insert(target);
        maskForClient(target);
        return target;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public WxPushTarget update(Long id, WxPushTargetDTO dto) {
        WxPushTarget target = wxPushTargetMapper.selectById(id);
        BusinessException.throwIf(target == null, ErrorCode.DATA_NOT_FOUND.getCode(), "推送目标不存在");
        assertAppIdUnique(dto.getAppId().trim(), id);
        applyDto(target, dto, false);
        if (Boolean.TRUE.equals(dto.getIsDefault())) {
            clearDefaults();
            target.setIsDefault(1);
        }
        wxPushTargetMapper.updateById(target);
        maskForClient(target);
        return target;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void delete(Long id) {
        WxPushTarget target = wxPushTargetMapper.selectById(id);
        BusinessException.throwIf(target == null, ErrorCode.DATA_NOT_FOUND.getCode(), "推送目标不存在");
        wxPushTargetMapper.deleteById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void setDefault(Long id) {
        WxPushTarget target = wxPushTargetMapper.selectById(id);
        BusinessException.throwIf(target == null, ErrorCode.DATA_NOT_FOUND.getCode(), "推送目标不存在");
        clearDefaults();
        target.setIsDefault(1);
        target.setStatus(1);
        wxPushTargetMapper.updateById(target);
    }

    @Override
    public ResolvedTarget resolveForPush(Long targetId, String overrideAppId) {
        if (targetId != null) {
            WxPushTarget target = wxPushTargetMapper.selectById(targetId);
            BusinessException.throwIf(target == null, ErrorCode.DATA_NOT_FOUND.getCode(), "推送目标不存在");
            BusinessException.throwIf(!Integer.valueOf(1).equals(target.getStatus()),
                    ErrorCode.PARAM_ERROR.getCode(), "该推送目标已停用");
            String appId = StringUtils.hasText(overrideAppId) ? overrideAppId.trim() : target.getAppId();
            String key = resolveUploadKey(target);
            BusinessException.throwIf(!StringUtils.hasText(key), ErrorCode.WX_UPLOAD_KEY_MISSING.getCode(),
                    "推送目标「" + target.getName() + "」未配置上传密钥（可填 PEM 或服务器文件路径）");
            return new ResolvedTarget(target.getId(), target.getName(), appId, key, "target");
        }

        if (StringUtils.hasText(overrideAppId)) {
            WxPushTarget byApp = wxPushTargetMapper.selectOne(new LambdaQueryWrapper<WxPushTarget>()
                    .eq(WxPushTarget::getAppId, overrideAppId.trim())
                    .eq(WxPushTarget::getStatus, 1)
                    .last("LIMIT 1"));
            if (byApp != null) {
                String key = resolveUploadKey(byApp);
                if (StringUtils.hasText(key)) {
                    return new ResolvedTarget(byApp.getId(), byApp.getName(), byApp.getAppId(), key, "target-by-appid");
                }
            }
        }

        WxPushTarget def = wxPushTargetMapper.selectOne(new LambdaQueryWrapper<WxPushTarget>()
                .eq(WxPushTarget::getIsDefault, 1)
                .eq(WxPushTarget::getStatus, 1)
                .last("LIMIT 1"));
        if (def != null) {
            String key = resolveUploadKey(def);
            if (StringUtils.hasText(key)) {
                String appId = StringUtils.hasText(overrideAppId) ? overrideAppId.trim() : def.getAppId();
                return new ResolvedTarget(def.getId(), def.getName(), appId, key, "default-target");
            }
        }

        String appId = firstNonBlank(
                overrideAppId,
                systemConfigService.getConfigValue("wx_appid"),
                systemConfigService.getConfigValue("appId"),
                defaultAppId);
        BusinessException.throwIf(!StringUtils.hasText(appId)
                        || "your-appid".equals(appId)
                        || "your-appid-here".equals(appId),
                ErrorCode.PARAM_ERROR.getCode(), "请先在系统设置或推送目标中配置微信小程序 AppID");

        String key = firstNonBlank(
                systemConfigService.getConfigValue("wx_upload_key"),
                systemConfigService.getConfigValue("uploadKey"),
                defaultUploadKey);
        if (StringUtils.hasText(key) && key.contains("PRIVATE KEY")) {
            return new ResolvedTarget(null, "系统配置", appId, key.replace("\\n", "\n").trim(), "system_config");
        }

        String pathCfg = systemConfigService.getConfigValue("wx_upload_key_path");
        if (StringUtils.hasText(pathCfg)) {
            String fromFile = readKeyFile(pathCfg.trim());
            if (StringUtils.hasText(fromFile)) {
                return new ResolvedTarget(null, "系统配置(文件)", appId, fromFile, "system_config_file");
            }
        }

        throw new BusinessException(ErrorCode.WX_UPLOAD_KEY_MISSING);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void ensureDefaultFromSystemConfig() {
        try {
            Long count = wxPushTargetMapper.selectCount(null);
            if (count != null && count > 0) {
                return;
            }
            String appId = firstNonBlank(
                    systemConfigService.getConfigValue("wx_appid"),
                    systemConfigService.getConfigValue("appId"),
                    defaultAppId);
            if (!StringUtils.hasText(appId) || "your-appid".equals(appId) || "your-appid-here".equals(appId)) {
                return;
            }
            WxPushTarget target = new WxPushTarget();
            target.setName("当前小程序");
            target.setAppId(appId.trim());
            target.setUploadKeyPath(blankToNull(systemConfigService.getConfigValue("wx_upload_key_path")));
            String key = firstNonBlank(
                    systemConfigService.getConfigValue("wx_upload_key"),
                    systemConfigService.getConfigValue("uploadKey"));
            if (StringUtils.hasText(key) && key.contains("PRIVATE KEY")) {
                target.setUploadKey(key.replace("\\n", "\n").trim());
            }
            target.setIsDefault(1);
            target.setStatus(1);
            target.setRemark("由系统配置 wx_appid 自动生成；可在发布中心切换/增删");
            wxPushTargetMapper.insert(target);
            log.info("已从 system_config 补齐默认微信推送目标 appId={}", appId);
        } catch (Exception e) {
            log.warn("补齐默认微信推送目标跳过: {}", e.getMessage());
        }
    }

    private void applyDto(WxPushTarget target, WxPushTargetDTO dto, boolean creating) {
        target.setName(dto.getName().trim());
        target.setAppId(dto.getAppId().trim());
        target.setUploadKeyPath(blankToNull(dto.getUploadKeyPath()));
        target.setRemark(blankToNull(dto.getRemark()));
        target.setStatus(dto.getStatus() == null ? 1 : dto.getStatus());
        if (creating) {
            target.setIsDefault(Boolean.TRUE.equals(dto.getIsDefault()) ? 1 : 0);
        }
        if (StringUtils.hasText(dto.getUploadKey())) {
            String key = dto.getUploadKey().replace("\\n", "\n").trim();
            BusinessException.throwIf(!key.contains("PRIVATE KEY"),
                    ErrorCode.PARAM_ERROR.getCode(), "上传密钥格式不正确，需包含 PRIVATE KEY");
            target.setUploadKey(key);
        }
    }

    private void assertAppIdUnique(String appId, Long excludeId) {
        Long count = wxPushTargetMapper.selectCount(new LambdaQueryWrapper<WxPushTarget>()
                .eq(WxPushTarget::getAppId, appId)
                .ne(excludeId != null, WxPushTarget::getId, excludeId));
        BusinessException.throwIf(count != null && count > 0,
                ErrorCode.PARAM_ERROR.getCode(), "该 AppID 已存在推送目标");
    }

    private void clearDefaults() {
        WxPushTarget patch = new WxPushTarget();
        patch.setIsDefault(0);
        wxPushTargetMapper.update(patch, new LambdaQueryWrapper<WxPushTarget>()
                .eq(WxPushTarget::getIsDefault, 1));
    }

    private long countEnabled() {
        Long c = wxPushTargetMapper.selectCount(new LambdaQueryWrapper<WxPushTarget>()
                .eq(WxPushTarget::getStatus, 1));
        return c == null ? 0 : c;
    }

    private void maskForClient(WxPushTarget target) {
        boolean has = StringUtils.hasText(target.getUploadKey())
                || (StringUtils.hasText(target.getUploadKeyPath()) && Files.isRegularFile(Paths.get(target.getUploadKeyPath())));
        target.setHasUploadKey(has);
        target.setUploadKey(null);
    }

    private String resolveUploadKey(WxPushTarget target) {
        if (StringUtils.hasText(target.getUploadKey()) && target.getUploadKey().contains("PRIVATE KEY")) {
            return target.getUploadKey().replace("\\n", "\n").trim();
        }
        if (StringUtils.hasText(target.getUploadKeyPath())) {
            return readKeyFile(target.getUploadKeyPath().trim());
        }
        return null;
    }

    private String readKeyFile(String pathStr) {
        try {
            Path path = Paths.get(pathStr);
            if (!Files.isRegularFile(path)) {
                log.warn("上传密钥文件不存在: {}", pathStr);
                return null;
            }
            String content = Files.readString(path, StandardCharsets.UTF_8).trim();
            if (!content.contains("PRIVATE KEY")) {
                log.warn("上传密钥文件内容不像 PEM: {}", pathStr);
                return null;
            }
            return content;
        } catch (Exception e) {
            log.warn("读取上传密钥文件失败 {}: {}", pathStr, e.getMessage());
            return null;
        }
    }

    private static String firstNonBlank(String... values) {
        if (values == null) return null;
        for (String v : values) {
            if (StringUtils.hasText(v)) return v.trim();
        }
        return null;
    }

    private static String blankToNull(String v) {
        return StringUtils.hasText(v) ? v.trim() : null;
    }
}
