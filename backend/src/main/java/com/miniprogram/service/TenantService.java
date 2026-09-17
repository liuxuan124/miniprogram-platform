package com.miniprogram.service;

import com.miniprogram.dto.TenantCreateDTO;
import com.miniprogram.entity.Tenant;

import java.util.List;

public interface TenantService {

    List<Tenant> listActive();

    Tenant getById(Long id);

    Tenant create(TenantCreateDTO dto);
}
