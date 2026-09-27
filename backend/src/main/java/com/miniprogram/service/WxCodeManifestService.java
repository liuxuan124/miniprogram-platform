package com.miniprogram.service;

import java.util.Map;
import java.util.Optional;
import java.util.Set;

public interface WxCodeManifestService {

    void register(Long tenantId, String wxVersion, Map<String, Object> manifest);

    Optional<Map<String, Object>> getLatestManifest(Long tenantId);

    Set<String> supportedComponentTypes(Long tenantId);

    void appendManifestWarnings(java.util.List<String> warnings, Long tenantId);
}
