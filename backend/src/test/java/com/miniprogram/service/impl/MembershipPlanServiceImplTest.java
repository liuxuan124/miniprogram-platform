package com.miniprogram.service.impl;

import com.miniprogram.common.BusinessException;
import com.miniprogram.dto.member.MembershipPlanDTO;
import com.miniprogram.mapper.MembershipPlanMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@ExtendWith(MockitoExtension.class)
class MembershipPlanServiceImplTest {

    @Mock
    private MembershipPlanMapper membershipPlanMapper;

    @InjectMocks
    private MembershipPlanServiceImpl service;

    private MembershipPlanDTO platformDto;

    @BeforeEach
    void setUp() {
        platformDto = new MembershipPlanDTO();
        platformDto.setScope("platform");
        platformDto.setName("年卡");
        platformDto.setGiftPlanetDays(0);
    }

    @Test
    void planetScope_requiresPlanetId() {
        MembershipPlanDTO dto = new MembershipPlanDTO();
        dto.setScope("planet");
        dto.setName("月卡");
        BusinessException ex = assertThrows(BusinessException.class, () -> service.createPlan(dto));
        assertEquals(500415, ex.getCode());
    }

    @Test
    void platformGiftDays_requiresGiftPlanetId() {
        platformDto.setGiftPlanetDays(7);
        platformDto.setGiftPlanetId(null);
        BusinessException ex = assertThrows(BusinessException.class, () -> service.createPlan(platformDto));
        assertEquals(500417, ex.getCode());
    }

    @Test
    void platform_rejectsPlanetId() {
        platformDto.setPlanetId("warm-main");
        BusinessException ex = assertThrows(BusinessException.class, () -> service.createPlan(platformDto));
        assertEquals(500416, ex.getCode());
    }
}
