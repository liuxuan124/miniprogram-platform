package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.dto.UserAddressDTO;
import com.miniprogram.dto.UserAddressVO;
import com.miniprogram.entity.UserAddress;
import com.miniprogram.mapper.UserAddressMapper;
import com.miniprogram.service.UserAddressService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserAddressServiceImpl implements UserAddressService {

    private final UserAddressMapper userAddressMapper;

    @Override
    public List<UserAddressVO> listByUser(Long userId) {
        return userAddressMapper.selectList(new LambdaQueryWrapper<UserAddress>()
                        .eq(UserAddress::getUserId, userId)
                        .orderByDesc(UserAddress::getIsDefault)
                        .orderByDesc(UserAddress::getUpdatedAt))
                .stream()
                .map(this::toVo)
                .toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserAddressVO create(Long userId, UserAddressDTO dto) {
        validateDto(dto);
        long count = userAddressMapper.selectCount(new LambdaQueryWrapper<UserAddress>()
                .eq(UserAddress::getUserId, userId));
        boolean asDefault = Boolean.TRUE.equals(dto.getIsDefault()) || count == 0;
        if (asDefault) {
            clearDefault(userId);
        }

        UserAddress entity = new UserAddress();
        entity.setUserId(userId);
        applyDto(entity, dto);
        entity.setIsDefault(asDefault ? 1 : 0);
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        userAddressMapper.insert(entity);
        return toVo(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserAddressVO update(Long userId, Long id, UserAddressDTO dto) {
        validateDto(dto);
        UserAddress entity = getOwned(userId, id);
        applyDto(entity, dto);
        if (Boolean.TRUE.equals(dto.getIsDefault())) {
            clearDefault(userId);
            entity.setIsDefault(1);
        }
        entity.setUpdatedAt(LocalDateTime.now());
        userAddressMapper.updateById(entity);
        return toVo(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void delete(Long userId, Long id) {
        UserAddress entity = getOwned(userId, id);
        userAddressMapper.deleteById(entity.getId());
        if (Integer.valueOf(1).equals(entity.getIsDefault())) {
            UserAddress next = userAddressMapper.selectOne(new LambdaQueryWrapper<UserAddress>()
                    .eq(UserAddress::getUserId, userId)
                    .orderByDesc(UserAddress::getUpdatedAt)
                    .last("LIMIT 1"));
            if (next != null) {
                next.setIsDefault(1);
                next.setUpdatedAt(LocalDateTime.now());
                userAddressMapper.updateById(next);
            }
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void setDefault(Long userId, Long id) {
        UserAddress entity = getOwned(userId, id);
        clearDefault(userId);
        entity.setIsDefault(1);
        entity.setUpdatedAt(LocalDateTime.now());
        userAddressMapper.updateById(entity);
    }

    private UserAddress getOwned(Long userId, Long id) {
        UserAddress entity = userAddressMapper.selectById(id);
        if (entity == null || !userId.equals(entity.getUserId())) {
            throw new BusinessException(400401, "地址不存在");
        }
        return entity;
    }

    private void clearDefault(Long userId) {
        userAddressMapper.update(null, new LambdaUpdateWrapper<UserAddress>()
                .eq(UserAddress::getUserId, userId)
                .eq(UserAddress::getIsDefault, 1)
                .set(UserAddress::getIsDefault, 0)
                .set(UserAddress::getUpdatedAt, LocalDateTime.now()));
    }

    private void validateDto(UserAddressDTO dto) {
        if (!StringUtils.hasText(dto.getName())
                || !StringUtils.hasText(dto.getPhone())
                || !StringUtils.hasText(dto.getProvince())
                || !StringUtils.hasText(dto.getCity())
                || !StringUtils.hasText(dto.getDistrict())
                || !StringUtils.hasText(dto.getDetail())) {
            throw new BusinessException(400201, "请完善收货地址信息");
        }
    }

    private void applyDto(UserAddress entity, UserAddressDTO dto) {
        entity.setName(dto.getName().trim());
        entity.setPhone(dto.getPhone().trim());
        entity.setProvince(dto.getProvince().trim());
        entity.setCity(dto.getCity().trim());
        entity.setDistrict(dto.getDistrict().trim());
        entity.setDetail(dto.getDetail().trim());
    }

    private UserAddressVO toVo(UserAddress entity) {
        UserAddressVO vo = new UserAddressVO();
        BeanUtils.copyProperties(entity, vo);
        vo.setIsDefault(Integer.valueOf(1).equals(entity.getIsDefault()));
        return vo;
    }
}
