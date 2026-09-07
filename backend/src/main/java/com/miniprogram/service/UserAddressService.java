package com.miniprogram.service;

import com.miniprogram.dto.UserAddressDTO;
import com.miniprogram.dto.UserAddressVO;

import java.util.List;

public interface UserAddressService {

    List<UserAddressVO> listByUser(Long userId);

    UserAddressVO create(Long userId, UserAddressDTO dto);

    UserAddressVO update(Long userId, Long id, UserAddressDTO dto);

    void delete(Long userId, Long id);

    void setDefault(Long userId, Long id);
}
