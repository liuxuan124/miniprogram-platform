package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.dto.mini.ContentPreviewTokenCreateVO;
import com.miniprogram.entity.MpPreviewTokenRevocation;
import com.miniprogram.mapper.MpPreviewTokenRevocationMapper;
import com.miniprogram.security.ContentPreviewTokenProvider;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.ContentPreviewTokenService;
import com.miniprogram.service.WxMiniappPreviewQrService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class ContentPreviewTokenServiceImpl implements ContentPreviewTokenService {

    private static final String SCENE_KEY_PREFIX = "mp_preview:scene:";
    private static final Duration SCENE_TTL = Duration.ofHours(2);
    private static final String DEFAULT_PAGE = "pages/index/index";

    private final ContentPreviewTokenProvider tokenProvider;
    private final MpPreviewTokenRevocationMapper revocationMapper;
    private final StringRedisTemplate stringRedisTemplate;
    private final WxMiniappPreviewQrService wxMiniappPreviewQrService;

    @Override
    public ContentPreviewTokenCreateVO createForCurrentOperator(boolean withWxQr) {
        Long tenantId = SecurityUtils.getCurrentTenantId() != null ? SecurityUtils.getCurrentTenantId() : 0L;
        Long operatorId = SecurityUtils.getCurrentUserId();
        ContentPreviewTokenProvider.IssuedToken issued = tokenProvider.issue(tenantId, operatorId);
        indexSceneToken(issued.jti(), issued.token());

        ContentPreviewTokenCreateVO.ContentPreviewTokenCreateVOBuilder builder = ContentPreviewTokenCreateVO.builder()
                .token(issued.token())
                .jti(issued.jti())
                .expiresAt(issued.expiresAt().toString())
                .launchQuery("pt=" + issued.token())
                .scene(issued.jti())
                .pagePath(DEFAULT_PAGE);

        if (withWxQr) {
            byte[] png = wxMiniappPreviewQrService.createUnlimitedQrPng(issued.jti(), DEFAULT_PAGE);
            if (png != null && png.length > 0) {
                builder.wxQrcodeBase64(Base64.getEncoder().encodeToString(png));
            }
        }
        return builder.build();
    }

    @Override
    public void revokeByJti(String jti) {
        if (!StringUtils.hasText(jti)) {
            throw new BusinessException(400, "jti 不能为空");
        }
        String trimmed = jti.trim();
        Long tenantId = SecurityUtils.getCurrentTenantId() != null ? SecurityUtils.getCurrentTenantId() : 0L;
        Long count = revocationMapper.selectCount(new LambdaQueryWrapper<MpPreviewTokenRevocation>()
                .eq(MpPreviewTokenRevocation::getJti, trimmed));
        if (count != null && count > 0) {
            stringRedisTemplate.delete(SCENE_KEY_PREFIX + trimmed);
            return;
        }
        MpPreviewTokenRevocation row = new MpPreviewTokenRevocation();
        row.setTenantId(tenantId);
        row.setJti(trimmed);
        row.setOperatorId(SecurityUtils.getCurrentUserId());
        row.setRevokedAt(LocalDateTime.now());
        revocationMapper.insert(row);
        stringRedisTemplate.delete(SCENE_KEY_PREFIX + trimmed);
    }

    @Override
    public String exchangeByJti(String jti) {
        if (!StringUtils.hasText(jti)) {
            throw new BusinessException(400, "jti 不能为空");
        }
        String trimmed = jti.trim();
        Long revoked = revocationMapper.selectCount(new LambdaQueryWrapper<MpPreviewTokenRevocation>()
                .eq(MpPreviewTokenRevocation::getJti, trimmed));
        if (revoked != null && revoked > 0) {
            throw new BusinessException(403, "预览已关闭");
        }
        String cached = stringRedisTemplate.opsForValue().get(SCENE_KEY_PREFIX + trimmed);
        if (!StringUtils.hasText(cached)) {
            throw new BusinessException(403, "预览已过期，请回管理端重新扫码");
        }
        validateAndParse(cached);
        return cached;
    }

    @Override
    public ContentPreviewTokenProvider.ParsedPreview validateAndParse(String token) {
        if (!StringUtils.hasText(token)) {
            throw new BusinessException(403, "缺少预览令牌");
        }
        ContentPreviewTokenProvider.InspectStatus status = tokenProvider.inspect(token.trim());
        if (status == ContentPreviewTokenProvider.InspectStatus.EXPIRED) {
            throw new BusinessException(403, "预览令牌已过期，请回管理端重新生成");
        }
        if (status == ContentPreviewTokenProvider.InspectStatus.INVALID) {
            throw new BusinessException(403, "预览令牌无效");
        }
        ContentPreviewTokenProvider.ParsedPreview parsed = tokenProvider.parse(token.trim());
        Long revoked = revocationMapper.selectCount(new LambdaQueryWrapper<MpPreviewTokenRevocation>()
                .eq(MpPreviewTokenRevocation::getJti, parsed.jti()));
        if (revoked != null && revoked > 0) {
            throw new BusinessException(403, "预览令牌已吊销");
        }
        return parsed;
    }

    private void indexSceneToken(String jti, String token) {
        if (!StringUtils.hasText(jti) || !StringUtils.hasText(token)) {
            return;
        }
        try {
            stringRedisTemplate.opsForValue().set(SCENE_KEY_PREFIX + jti.trim(), token.trim(), SCENE_TTL);
        } catch (Exception ignored) {
            // Redis 不可用时仍可用 pt= 长 query 启动
        }
    }
}
