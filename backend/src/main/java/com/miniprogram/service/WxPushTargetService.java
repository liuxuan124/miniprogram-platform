package com.miniprogram.service;

import com.miniprogram.dto.miniapp.WxPushTargetDTO;
import com.miniprogram.entity.WxPushTarget;

import java.util.List;

/**
 * 微信体验版推送目标（按 AppID；与整店模板套用无关）
 */
public interface WxPushTargetService {

    List<WxPushTarget> listEnabled();

    List<WxPushTarget> listAll();

    WxPushTarget getById(Long id);

    WxPushTarget create(WxPushTargetDTO dto);

    WxPushTarget update(Long id, WxPushTargetDTO dto);

    void delete(Long id);

    void setDefault(Long id);

    /** 解析可用于上传的 AppID + 密钥；无目标时回落系统配置 */
    ResolvedTarget resolveForPush(Long targetId, String overrideAppId);

    /** 若尚无目标且 system_config 有 wx_appid，则补一条默认目标 */
    void ensureDefaultFromSystemConfig();

    record ResolvedTarget(Long targetId, String name, String appId, String uploadKey, String source) {}
}
