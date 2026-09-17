package com.miniprogram.service;

import com.miniprogram.dto.planet.PlanetConfigDTO;
import com.miniprogram.dto.planet.PlanetConfigVO;
import com.miniprogram.entity.Product;
import com.miniprogram.entity.User;

import java.math.BigDecimal;

/**
 * 付费会员 / 星球访问
 */
public interface MembershipAccessService {

    boolean hasActivePaidMembership(Long userId);

    boolean hasActivePaidMembership(User user);

    boolean hasBenefit(Long userId, String code);

    /** 会员价 / 会员免费 / 等级折扣，下单与购物车共用 */
    BigDecimal applyShopPrice(Long userId, Product product, BigDecimal listPrice);

    void grantMembership(Long userId, Long levelId, Integer membershipDays);

    PlanetConfigVO getPublicPlanetHome(Long userId);

    PlanetConfigVO getAdminPlanetConfig();

    void saveAdminPlanetConfig(PlanetConfigDTO dto);

    /** 未付费可见策略 */
    String unpaidViewMode();

    int previewCount();
}
