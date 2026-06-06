package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.module.CreateModuleVersionDTO;
import com.miniprogram.dto.module.ModuleVersionQueryDTO;
import com.miniprogram.entity.ModuleVersion;

import java.util.List;
import java.util.Map;

public interface ModuleVersionService {

    PageResult<ModuleVersion> listVersions(ModuleVersionQueryDTO query);

    List<ModuleVersion> listVersionsByTarget(String moduleType, Long targetId);

    ModuleVersion getVersionDetail(Long id);

    ModuleVersion getLatestPublished(String moduleType, Long targetId);

    ModuleVersion createVersion(CreateModuleVersionDTO dto);

    ModuleVersion publishVersion(Long id);

    ModuleVersion rollbackVersion(Long id, String reason);

    void deleteVersion(Long id);

    Map<String, Object> getVersionStats(String moduleType);
}
