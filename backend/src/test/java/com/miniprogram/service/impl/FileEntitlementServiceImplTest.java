package com.miniprogram.service.impl;

import com.miniprogram.entity.FileItem;
import com.miniprogram.mapper.FileItemMapper;
import com.miniprogram.mapper.MemberLevelMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.member.MemberBenefitCodes;
import com.miniprogram.service.MembershipAccessService;
import com.miniprogram.service.PurchaseEntitlementService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * planet_member：有明确 planetId 才鉴权；成长权益码不单独放行。
 */
class FileEntitlementServiceImplTest {

    private MembershipAccessService membershipAccessService;
    private FileEntitlementServiceImpl service;

    @BeforeEach
    void setUp() {
        membershipAccessService = mock(MembershipAccessService.class);
        service = new FileEntitlementServiceImpl(
                mock(FileItemMapper.class),
                mock(UserMapper.class),
                mock(MemberLevelMapper.class),
                membershipAccessService,
                mock(PurchaseEntitlementService.class)
        );
        ReflectionTestUtils.setField(service, "uploadDir", "./uploads");
    }

    @Test
    void planetMember_withoutPlanetId_denied() {
        FileItem item = planetFile();
        when(membershipAccessService.hasBenefit(1L, MemberBenefitCodes.FILE_UNLOCK_ALL)).thenReturn(false);
        when(membershipAccessService.hasBenefit(1L, MemberBenefitCodes.PLANET_EXCLUSIVE)).thenReturn(true);

        assertFalse(service.canRead(item, 1L));
        assertFalse(service.canRead(item, 1L, null));
        assertFalse(service.canRead(item, 1L, "  "));
        verify(membershipAccessService, never()).hasPlanetMembership(org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyString());
        verify(membershipAccessService, never()).resolveDefaultPlanetId();
    }

    @Test
    void planetMember_withPlanetId_usesExactMatch() {
        FileItem item = planetFile();
        when(membershipAccessService.hasBenefit(1L, MemberBenefitCodes.FILE_UNLOCK_ALL)).thenReturn(false);
        when(membershipAccessService.hasPlanetMembership(1L, "warm-main")).thenReturn(true);
        when(membershipAccessService.hasPlanetMembership(1L, "warm-read")).thenReturn(false);

        assertTrue(service.canRead(item, 1L, "warm-main"));
        assertFalse(service.canRead(item, 1L, "warm-read"));
        verify(membershipAccessService, never()).resolveDefaultPlanetId();
    }

    @Test
    void planetExclusiveBenefit_alone_doesNotUnlock() {
        FileItem item = planetFile();
        when(membershipAccessService.hasBenefit(1L, MemberBenefitCodes.FILE_UNLOCK_ALL)).thenReturn(false);
        when(membershipAccessService.hasBenefit(1L, MemberBenefitCodes.PLANET_EXCLUSIVE)).thenReturn(true);
        when(membershipAccessService.hasPlanetMembership(1L, "warm-main")).thenReturn(false);

        assertFalse(service.canRead(item, 1L, "warm-main"));
    }

    private static FileItem planetFile() {
        FileItem item = new FileItem();
        item.setId(10L);
        item.setReadMode("planet_member");
        item.setStatus("published");
        return item;
    }
}
