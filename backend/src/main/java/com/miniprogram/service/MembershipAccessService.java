package com.miniprogram.service;

import com.miniprogram.dto.planet.MainPlanetVO;
import com.miniprogram.dto.planet.PlanetCommunityVO;
import com.miniprogram.dto.planet.PlanetConfigDTO;
import com.miniprogram.dto.planet.PlanetConfigVO;
import com.miniprogram.entity.Product;
import com.miniprogram.entity.User;

import java.math.BigDecimal;
import java.util.List;

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

    /** planetId 为空时用用户主星球 / 配置 primary */
    PlanetConfigVO getPublicPlanetHome(Long userId, String planetId);

    PlanetConfigVO getAdminPlanetConfig();

    void saveAdminPlanetConfig(PlanetConfigDTO dto);

    /** 社区列表（虚拟/配置灌库）；userId 非空时 primary 表示用户主星球 */
    List<PlanetCommunityVO> listCommunities();

    List<PlanetCommunityVO> listCommunities(Long userId);

    /** 单个社区卡片 */
    PlanetCommunityVO getCommunity(String id);

    /** 解析主星球（用户偏好 → 配置 primary → 首个） */
    MainPlanetVO resolveMainPlanet(Long userId);

    /** 设置用户主星球（常驻） */
    MainPlanetVO setMainPlanet(Long userId, String planetId);

    /** 配置默认主星球 ID（primary 或首个） */
    String resolveDefaultPlanetId();

    /** 未付费可见策略 */
    String unpaidViewMode();

    int previewCount();
}
