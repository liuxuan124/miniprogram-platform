package com.miniprogram.service;

import com.miniprogram.dto.planet.MainPlanetVO;
import com.miniprogram.dto.planet.PlanetCommunityVO;
import com.miniprogram.dto.planet.PlanetConfigDTO;
import com.miniprogram.dto.planet.PlanetConfigVO;
import com.miniprogram.entity.MembershipPlan;
import com.miniprogram.entity.Product;
import com.miniprogram.entity.User;

import java.math.BigDecimal;
import java.util.List;

/**
 * 付费会员 / 星球访问
 */
public interface MembershipAccessService {

    /** 平台付费订购是否有效（真源：mp_member_subscription scope=platform） */
    boolean hasPlatformMembership(Long userId);

    /** 指定星球付费订购是否有效（真源：mp_member_subscription scope=planet） */
    boolean hasPlanetMembership(Long userId, String planetId);

    /**
     * 有效订购的到期时间。无有效订购或终身（expire_at null）均返回 null；
     * 展示前请先 {@link #hasPlatformMembership} / {@link #hasPlanetMembership}。
     *
     * @param scope    platform | planet
     * @param planetId scope=planet 时必填
     */
    java.time.LocalDateTime findActiveExpireAt(Long userId, String scope, String planetId);

    /**
     * @deprecated 委托 {@link #hasPlatformMembership}；星球内容门禁禁止使用，请改调 {@link #hasPlanetMembership}
     */
    @Deprecated
    boolean hasActivePaidMembership(Long userId);

    /**
     * @deprecated 委托 {@link #hasPlatformMembership}
     */
    @Deprecated
    boolean hasActivePaidMembership(User user);

    /**
     * 按付费档开通/续期订购；平台档可附带 gift 星球天数。
     * planId 为空时回退写 platform 订购（plan_id 可空）。
     * 不写成长 level_id。
     */
    void grantSubscription(Long userId, Long planId, Integer membershipDays, Long orderId);

    /**
     * 平台会员权益码判定：优先有效平台订购对应 {@code MembershipPlan.rights}，
     * 无 plan 或 rights 空时回退成长等级 {@code mp_member_level.rights}。
     */
    boolean hasBenefit(Long userId, String code);

    /** 当前有效平台付费档；无订购返回 null */
    MembershipPlan findActivePlatformPlan(Long userId);

    /**
     * 会员价 / 会员免费 / 折扣：折扣优先读订购对应 {@code MembershipPlan.discountRate}，
     * 否则回退成长等级折扣（须有 {@code member_discount} 权益）。
     */
    BigDecimal applyShopPrice(Long userId, Product product, BigDecimal listPrice);

    /**
     * @deprecated 支付已走 {@link #grantSubscription}；实现拒绝写 level_id / 叠 gift。
     */
    @Deprecated
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
