package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.dto.planet.MainPlanetVO;
import com.miniprogram.dto.planet.PlanetCommunityVO;
import com.miniprogram.dto.planet.PlanetConfigDTO;
import com.miniprogram.dto.planet.PlanetConfigVO;
import com.miniprogram.dto.system.ConfigBatchUpdateDTO;
import com.miniprogram.dto.system.ConfigItemDTO;
import com.miniprogram.entity.MemberLevel;
import com.miniprogram.entity.MemberSubscription;
import com.miniprogram.entity.MembershipPlan;
import com.miniprogram.entity.Order;
import com.miniprogram.entity.OrderItem;
import com.miniprogram.entity.Product;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.MemberLevelMapper;
import com.miniprogram.mapper.MemberSubscriptionMapper;
import com.miniprogram.mapper.MembershipPlanMapper;
import com.miniprogram.mapper.OrderItemMapper;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.member.MemberBenefitCodes;
import com.miniprogram.product.ProductTypes;
import com.miniprogram.service.MembershipAccessService;
import com.miniprogram.service.PlanetStatsService;
import com.miniprogram.service.SystemConfigService;
import com.miniprogram.support.FeatureModuleGuard;
import com.miniprogram.tenant.MpTenantLineHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MembershipAccessServiceImpl implements MembershipAccessService {

    private static final String CONFIG_KEY = "planet_config";
    private static final String SCOPE_PLATFORM = "platform";
    private static final String SCOPE_PLANET = "planet";
    private static final String STATUS_ACTIVE = "active";
    /** 与 MembershipSubscriptionMigrator 付费会员订单判定一致 */
    private static final Set<String> PAID_ORDER_STATUSES = Set.of("paid", "shipped", "completed");
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final UserMapper userMapper;
    private final MemberLevelMapper memberLevelMapper;
    private final MemberSubscriptionMapper memberSubscriptionMapper;
    private final MembershipPlanMapper membershipPlanMapper;
    private final ProductMapper productMapper;
    private final OrderMapper orderMapper;
    private final OrderItemMapper orderItemMapper;
    private final SystemConfigService systemConfigService;
    private final FeatureModuleGuard featureModuleGuard;
    private final PlanetStatsService planetStatsService;
    private final ObjectMapper objectMapper;

    @Override
    public boolean hasPlatformMembership(Long userId) {
        if (userId == null) {
            return false;
        }
        if (hasActiveSubscription(userId, SCOPE_PLATFORM, null)) {
            return true;
        }
        // 有平台订购行时只信订购表，不再用 level_id / legacy 放行
        if (countPlatformSubscriptionRows(userId) > 0) {
            return false;
        }
        return legacyPlatformActive(userMapper.selectById(userId));
    }

    @Override
    public boolean hasPlanetMembership(Long userId, String planetId) {
        if (userId == null || !StringUtils.hasText(planetId)) {
            return false;
        }
        return hasActiveSubscription(userId, SCOPE_PLANET, planetId.trim());
    }

    @Override
    public LocalDateTime findActiveExpireAt(Long userId, String scope, String planetId) {
        if (userId == null || !StringUtils.hasText(scope)) {
            return null;
        }
        String s = scope.trim().toLowerCase();
        if (!SCOPE_PLATFORM.equals(s) && !SCOPE_PLANET.equals(s)) {
            return null;
        }
        return findActiveExpireAtInternal(userId, s, planetId);
    }

    @Override
    @Deprecated
    public boolean hasActivePaidMembership(Long userId) {
        return hasPlatformMembership(userId);
    }

    @Override
    @Deprecated
    public boolean hasActivePaidMembership(User user) {
        if (user == null || user.getId() == null) {
            return false;
        }
        return hasPlatformMembership(user.getId());
    }

    @Override
    public void grantSubscription(Long userId, Long planId, Integer membershipDays, Long orderId) {
        if (userId == null) {
            return;
        }
        // 旧商品无 plan：仅写 platform 订购，plan_id 可空；不写成长 level_id
        if (planId == null) {
            LocalDateTime expireAt = upsertSubscription(
                    userId, SCOPE_PLATFORM, null, null, orderId, "purchase", membershipDays);
            mirrorPlatformExpire(userId, expireAt);
            log.warn("grantSubscription: planId null, platform fallback userId={} days={} orderId={}",
                    userId, membershipDays, orderId);
            return;
        }
        MembershipPlan plan = membershipPlanMapper.selectById(planId);
        if (plan == null) {
            log.warn("grantSubscription: plan not found planId={} userId={} orderId={}",
                    planId, userId, orderId);
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "会员档位不存在: planId=" + planId);
        }
        String scope = plan.getScope() == null ? "" : plan.getScope().trim().toLowerCase();
        if (!SCOPE_PLATFORM.equals(scope) && !SCOPE_PLANET.equals(scope)) {
            log.warn("grantSubscription: invalid scope={} planId={}", plan.getScope(), planId);
            return;
        }
        String planetId = SCOPE_PLANET.equals(scope) ? trimToNull(plan.getPlanetId()) : null;
        if (SCOPE_PLANET.equals(scope) && planetId == null) {
            log.warn("grantSubscription: planet plan missing planetId planId={}", planId);
            return;
        }
        LocalDateTime expireAt = upsertSubscription(
                userId, scope, planetId, planId, orderId, "purchase", membershipDays);
        if (SCOPE_PLATFORM.equals(scope)) {
            mirrorPlatformExpire(userId, expireAt);
            int giftDays = plan.getGiftPlanetDays() == null ? 0 : Math.max(0, plan.getGiftPlanetDays());
            String giftPlanetId = trimToNull(plan.getGiftPlanetId());
            if (giftDays > 0 && giftPlanetId != null) {
                // 赠送天数单独写星球行，不叠加进平台 expireAt
                upsertSubscription(userId, SCOPE_PLANET, giftPlanetId, planId, orderId, "gift", giftDays);
            }
        }
        log.info("grantSubscription userId={} planId={} scope={} days={} orderId={}",
                userId, planId, scope, membershipDays, orderId);
    }

    @Override
    public boolean hasBenefit(Long userId, String code) {
        if (userId == null || !StringUtils.hasText(code) || !hasPlatformMembership(userId)) {
            return false;
        }
        // 优先读有效平台订购对应付费档 rights；无 plan / rights 空再回退成长等级
        MembershipPlan plan = findActivePlatformPlan(userId);
        if (plan != null) {
            List<String> planRights = MemberBenefitCodes.normalize(plan.getRights());
            if (!planRights.isEmpty()) {
                return MemberBenefitCodes.has(planRights, code);
            }
        }
        return hasBenefitFromGrowthLevel(userId, code);
    }

    @Override
    public BigDecimal applyShopPrice(Long userId, Product product, BigDecimal listPrice) {
        BigDecimal base = listPrice != null ? listPrice : BigDecimal.ZERO;
        if (product == null || !hasPlatformMembership(userId)) {
            return base;
        }
        if (Integer.valueOf(1).equals(product.getMemberFree())) {
            return BigDecimal.ZERO;
        }
        if (product.getMemberPrice() != null && product.getMemberPrice().compareTo(BigDecimal.ZERO) >= 0) {
            return product.getMemberPrice();
        }
        // 折扣优先读付费档 discountRate
        MembershipPlan plan = findActivePlatformPlan(userId);
        if (plan != null && plan.getDiscountRate() != null) {
            BigDecimal discounted = applyDiscountRate(base, plan.getDiscountRate());
            if (discounted != null) {
                return discounted;
            }
        }
        // 无 plan 折扣时：须有 member_discount 权益，再读成长等级折扣
        if (!hasBenefit(userId, MemberBenefitCodes.MEMBER_DISCOUNT)) {
            return base;
        }
        User user = userMapper.selectById(userId);
        if (user == null || user.getLevelId() == null) {
            return base;
        }
        MemberLevel level = memberLevelMapper.selectById(user.getLevelId());
        if (level == null || level.getDiscountRate() == null) {
            return base;
        }
        BigDecimal discounted = applyDiscountRate(base, level.getDiscountRate());
        return discounted != null ? discounted : base;
    }

    /**
     * @deprecated 支付已走 {@link #grantSubscription}。禁止再写成长 level_id、禁止把 gift 叠进 expire。
     */
    @Override
    @Deprecated
    public void grantMembership(Long userId, Long levelId, Integer membershipDays) {
        log.error("grantMembership 已废弃且拒绝执行：禁止写 level_id / 叠 gift 进 expire；请改用 grantSubscription。userId={} levelId={} days={}",
                userId, levelId, membershipDays);
    }

    @Override
    public PlanetConfigVO getPublicPlanetHome(Long userId) {
        return getPublicPlanetHome(userId, null);
    }

    @Override
    public PlanetConfigVO getPublicPlanetHome(Long userId, String planetId) {
        Map<String, Object> raw = readConfigMap();
        PlanetConfigVO vo = toVo(raw);
        vo.setEnabled(featureModuleGuard.isEnabled("planet"));
        String resolvedPlanetId = resolvePlanetIdForHome(userId, planetId);
        boolean platformActive = hasPlatformMembership(userId);
        boolean planetActive = hasPlanetMembership(userId, resolvedPlanetId);
        vo.setPlatformMemberActive(platformActive);
        vo.setPlanetMemberActive(planetActive);
        // 兼容：星球首页语境镜像本星球开通态
        vo.setMemberActive(planetActive);
        vo.setPlatformExpireText("");
        vo.setPlanetExpireText("");
        vo.setExpireText("");
        if (userId != null) {
            User user = userMapper.selectById(userId);
            if (user != null) {
                vo.setMemberLevelId(user.getLevelId());
                LocalDateTime platformExpire = findActiveExpireAtInternal(userId, SCOPE_PLATFORM, null);
                if (platformExpire == null && platformActive && user.getMemberExpireAt() != null) {
                    platformExpire = user.getMemberExpireAt();
                }
                LocalDateTime planetExpire = findActiveExpireAtInternal(userId, SCOPE_PLANET, resolvedPlanetId);
                if (platformActive) {
                    vo.setPlatformExpireText(formatExpireText("平台会员", platformExpire));
                }
                if (planetActive) {
                    vo.setPlanetExpireText(formatExpireText("本星球会员", planetExpire));
                }
                // 兼容旧字段：优先本星球到期
                LocalDateTime displayExpire = planetActive ? planetExpire : (platformActive ? platformExpire : null);
                if (displayExpire != null) {
                    vo.setMemberExpireAt(displayExpire.format(FMT));
                }
                if (planetActive) {
                    vo.setExpireText(vo.getPlanetExpireText());
                } else if (platformActive) {
                    vo.setExpireText(vo.getPlatformExpireText());
                }
                if (user.getLevelId() != null) {
                    MemberLevel level = memberLevelMapper.selectById(user.getLevelId());
                    if (level != null) {
                        vo.setMemberLevelName(level.getName());
                    }
                }
            }
        }
        vo.setPackages(listPackages(resolvedPlanetId, SCOPE_PLANET));
        vo.setPlatformPackages(listPackages(null, SCOPE_PLATFORM));
        applyLiveKpis(vo, raw);
        applyLiveTopics(vo, userId, resolvedPlanetId);
        return vo;
    }

    @Override
    public PlanetConfigVO getAdminPlanetConfig() {
        Map<String, Object> raw = readConfigMap();
        PlanetConfigVO vo = toVo(raw);
        vo.setEnabled(featureModuleGuard.isEnabled("planet"));
        vo.setPackages(listPackages(resolveDefaultPlanetId(), SCOPE_PLANET));
        vo.setPlatformPackages(listPackages(null, SCOPE_PLATFORM));
        applyLiveKpis(vo, raw);
        Map<String, Object> live = new LinkedHashMap<>();
        live.put("activeMembers", planetStatsService.countActiveMembers());
        live.put("todayPosts", planetStatsService.countTodayPlanetPosts());
        live.put("planetPosts", planetStatsService.countPlanetPosts());
        live.put("homeItems", planetStatsService.pickHomeTopicItems());
        live.put("weeklyTopics", planetStatsService.pickWeeklyHotTopics(
                resolveDefaultPlanetId(), resolveDefaultPlanetId(), 4));
        if (vo.getOps() == null) {
            vo.setOps(new LinkedHashMap<>());
        }
        vo.getOps().put("liveStats", live);
        // 管理端返回全部社区（含停用），便于运营维护
        Map<String, Object> cfg = readConfigMap();
        List<PlanetCommunityVO> allCommunities = parseCommunities(cfg.get("communities"));
        if (allCommunities.isEmpty()) {
            allCommunities = defaultCommunities();
        }
        vo.setCommunities(allCommunities);
        return vo;
    }

    @Override
    public List<PlanetCommunityVO> listCommunities() {
        return listCommunities(null);
    }

    @Override
    public List<PlanetCommunityVO> listCommunities(Long userId) {
        Map<String, Object> map = readConfigMap();
        List<PlanetCommunityVO> list = parseCommunities(map.get("communities"));
        if (list.isEmpty()) {
            list = defaultCommunities();
        }
        // 管理端配置含停用项时，用户端只返回启用中的社区
        list = list.stream()
                .filter(c -> c.getEnabled() == null || Boolean.TRUE.equals(c.getEnabled()))
                .collect(Collectors.toCollection(ArrayList::new));
        enrichCommunityStats(list);
        applyUserMainPlanet(list, userId);
        return list;
    }

    @Override
    public PlanetCommunityVO getCommunity(String id) {
        String key = id == null ? "" : id.trim();
        for (PlanetCommunityVO c : listCommunities(null)) {
            if (key.equals(c.getId())) {
                return c;
            }
        }
        PlanetCommunityVO fallback = defaultCommunities().stream()
                .filter(c -> key.equals(c.getId()) || key.isEmpty() && Boolean.TRUE.equals(c.getPrimary()))
                .findFirst()
                .orElseGet(() -> defaultCommunities().get(0));
        enrichCommunityStats(List.of(fallback));
        return fallback;
    }

    @Override
    public MainPlanetVO resolveMainPlanet(Long userId) {
        List<PlanetCommunityVO> list = listCommunities(null);
        String configPrimary = pickConfigPrimaryId(list);
        String userMain = null;
        boolean userSet = false;
        if (userId != null) {
            User user = userMapper.selectById(userId);
            if (user != null && StringUtils.hasText(user.getMainPlanetId())) {
                String candidate = user.getMainPlanetId().trim();
                if (findCommunity(list, candidate) != null) {
                    userMain = candidate;
                    userSet = true;
                }
            }
        }
        String planetId = StringUtils.hasText(userMain) ? userMain : configPrimary;
        MainPlanetVO vo = new MainPlanetVO();
        vo.setPlanetId(planetId);
        vo.setUserSet(userSet);
        PlanetCommunityVO community = findCommunity(list, planetId);
        if (community != null) {
            community.setPrimary(true);
            enrichCommunityStats(List.of(community));
        }
        vo.setCommunity(community);
        return vo;
    }

    @Override
    public MainPlanetVO setMainPlanet(Long userId, String planetId) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
        if (!StringUtils.hasText(planetId)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "请选择星球");
        }
        String id = planetId.trim();
        PlanetCommunityVO community = getCommunity(id);
        if (community == null || !id.equals(community.getId())) {
            throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "星球不存在");
        }
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID.getCode(), "用户不存在");
        }
        user.setMainPlanetId(id);
        userMapper.updateById(user);
        MainPlanetVO vo = new MainPlanetVO();
        vo.setPlanetId(id);
        vo.setUserSet(true);
        community.setPrimary(true);
        vo.setCommunity(community);
        return vo;
    }

    @Override
    public String resolveDefaultPlanetId() {
        return pickConfigPrimaryId(listCommunities(null));
    }

    private void applyUserMainPlanet(List<PlanetCommunityVO> list, Long userId) {
        if (list == null || list.isEmpty()) return;
        String mainId = null;
        if (userId != null) {
            User user = userMapper.selectById(userId);
            if (user != null && StringUtils.hasText(user.getMainPlanetId())) {
                String candidate = user.getMainPlanetId().trim();
                if (findCommunity(list, candidate) != null) {
                    mainId = candidate;
                }
            }
        }
        if (!StringUtils.hasText(mainId)) {
            mainId = pickConfigPrimaryId(list);
        }
        for (PlanetCommunityVO c : list) {
            c.setPrimary(mainId.equals(c.getId()));
        }
    }

    private String pickConfigPrimaryId(List<PlanetCommunityVO> list) {
        if (list == null || list.isEmpty()) {
            return "warm-main";
        }
        for (PlanetCommunityVO c : list) {
            if (Boolean.TRUE.equals(c.getPrimary()) && StringUtils.hasText(c.getId())) {
                return c.getId();
            }
        }
        return list.get(0).getId();
    }

    private PlanetCommunityVO findCommunity(List<PlanetCommunityVO> list, String id) {
        if (list == null || !StringUtils.hasText(id)) return null;
        for (PlanetCommunityVO c : list) {
            if (id.equals(c.getId())) return c;
        }
        return null;
    }

    @Override
    public void saveAdminPlanetConfig(PlanetConfigDTO dto) {
        Map<String, Object> map = readConfigMap();
        if (dto == null) {
            return;
        }
        if (dto.getTitle() != null) map.put("title", dto.getTitle().trim());
        if (dto.getSubtitle() != null) map.put("subtitle", dto.getSubtitle().trim());
        if (dto.getCoverImage() != null) map.put("coverImage", dto.getCoverImage().trim());
        if (dto.getUnpaidViewMode() != null) map.put("unpaidViewMode", normalizeViewMode(dto.getUnpaidViewMode()));
        if (dto.getPreviewCount() != null) map.put("previewCount", Math.max(0, dto.getPreviewCount()));
        if (dto.getEntryLabel() != null) map.put("entryLabel", dto.getEntryLabel().trim());
        if (dto.getExpireText() != null) map.put("expireText", dto.getExpireText().trim());
        if (dto.getKpis() != null) map.put("kpis", dto.getKpis());
        if (dto.getTopics() != null) map.put("topics", dto.getTopics());
        if (dto.getSegs() != null) map.put("segs", dto.getSegs());
        if (dto.getOps() != null) {
            map.put("ops", dto.getOps());
            if (dto.getOps() instanceof Map<?, ?> opsMap) {
                List<Map<String, String>> kpis = new ArrayList<>();
                kpis.add(kpiItem("球友", opsMap.get("kpiMembers")));
                kpis.add(kpiItem("沉淀内容", opsMap.get("kpiPosts")));
                kpis.add(kpiItem("今日提问", opsMap.get("kpiQuestions")));
                map.put("kpis", kpis);
            }
        }
        if (dto.getCommunities() != null) {
            map.put("communities", dto.getCommunities());
        }
        try {
            ConfigItemDTO item = new ConfigItemDTO();
            item.setConfigKey(CONFIG_KEY);
            item.setConfigValue(objectMapper.writeValueAsString(map));
            item.setConfigGroup("basic");
            item.setDescription("知识星球配置");
            ConfigBatchUpdateDTO batch = new ConfigBatchUpdateDTO();
            batch.setConfigs(List.of(item));
            systemConfigService.batchUpdateConfigs(batch);
        } catch (Exception e) {
            throw new RuntimeException("保存星球配置失败: " + e.getMessage(), e);
        }
    }

    @Override
    public String unpaidViewMode() {
        return normalizeViewMode(String.valueOf(readConfigMap().getOrDefault("unpaidViewMode", "summary")));
    }

    @Override
    public int previewCount() {
        Object n = readConfigMap().get("previewCount");
        if (n instanceof Number) {
            return Math.max(0, ((Number) n).intValue());
        }
        try {
            return Math.max(0, Integer.parseInt(String.valueOf(n)));
        } catch (Exception e) {
            return 3;
        }
    }

    private List<PlanetConfigVO.PlanetPackageVO> listPackages(String planetId, String scopeFilter) {
        List<Product> products = productMapper.selectList(new LambdaQueryWrapper<Product>()
                .eq(Product::getStatus, "on_sale")
                .and(w -> w.eq(Product::getProductType, ProductTypes.MEMBERSHIP)
                        .or().like(Product::getProductTypes, ProductTypes.MEMBERSHIP))
                .orderByAsc(Product::getSortOrder)
                .orderByDesc(Product::getId));
        List<PlanetConfigVO.PlanetPackageVO> list = new ArrayList<>();
        for (Product p : products) {
            if (!ProductTypes.isMembership(p.getProductType(), p.getProductTypes())) {
                continue;
            }
            if (!matchPackageScope(p, scopeFilter, planetId)) {
                continue;
            }
            PlanetConfigVO.PlanetPackageVO pkg = new PlanetConfigVO.PlanetPackageVO();
            pkg.setProductId(p.getId());
            pkg.setName(p.getName());
            pkg.setDescription(p.getDescription());
            pkg.setMainImage(p.getMainImage());
            pkg.setPrice(p.getPrice());
            pkg.setOriginalPrice(p.getOriginalPrice());
            pkg.setMembershipDays(p.getMembershipDays() == null ? 0 : p.getMembershipDays());
            pkg.setMembershipLevelId(p.getMembershipLevelId());
            if (p.getMembershipLevelId() != null) {
                MemberLevel level = memberLevelMapper.selectById(p.getMembershipLevelId());
                if (level != null) {
                    pkg.setMembershipLevelName(level.getName());
                }
            }
            list.add(pkg);
        }
        return list;
    }

    /**
     * 按 plan.scope 过滤：planet 仅当前 planetId；platform 仅平台档。
     * 未绑 plan 的旧会员商品：平台列表保留、星球列表排除。
     */
    private boolean matchPackageScope(Product product, String scopeFilter, String planetId) {
        if (product.getMembershipPlanId() == null) {
            return SCOPE_PLATFORM.equals(scopeFilter);
        }
        MembershipPlan plan = membershipPlanMapper.selectById(product.getMembershipPlanId());
        if (plan == null || plan.getStatus() != null && plan.getStatus() == 0) {
            return false;
        }
        String scope = plan.getScope() == null ? "" : plan.getScope().trim().toLowerCase();
        if (!scope.equals(scopeFilter)) {
            return false;
        }
        if (SCOPE_PLANET.equals(scopeFilter)) {
            return StringUtils.hasText(planetId)
                    && planetId.equals(plan.getPlanetId() == null ? "" : plan.getPlanetId().trim());
        }
        return true;
    }

    private static String formatExpireText(String label, LocalDateTime expireAt) {
        if (expireAt == null) {
            return label + "有效（终身）";
        }
        return label + "至 " + expireAt.toLocalDate();
    }

    private Map<String, Object> readConfigMap() {
        String raw = systemConfigService.getConfigValue(CONFIG_KEY, "");
        Map<String, Object> defaults = defaultMap();
        if (!StringUtils.hasText(raw)) {
            return defaults;
        }
        try {
            Map<String, Object> parsed = objectMapper.readValue(raw, new TypeReference<>() {});
            defaults.putAll(parsed);
            return defaults;
        } catch (Exception e) {
            log.warn("planet_config 解析失败: {}", e.getMessage());
            return defaults;
        }
    }

    private Map<String, Object> defaultMap() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("title", "星球");
        map.put("subtitle", "星主精选动态与资料");
        map.put("coverImage", "");
        map.put("unpaidViewMode", "summary");
        map.put("previewCount", 3);
        map.put("entryLabel", "星球");
        map.put("expireText", "");
        map.put("kpis", List.of());
        map.put("topics", List.of());
        map.put("segs", List.of(
                Map.of("key", "all", "label", "全部"),
                Map.of("key", "official", "label", "官方更新"),
                Map.of("key", "essence", "label", "精华"),
                Map.of("key", "ask", "label", "读者提问"),
                Map.of("key", "checkin", "label", "打卡"),
                Map.of("key", "resources", "label", "资料库")
        ));
        map.put("communities", defaultCommunityMaps());
        return map;
    }

    private List<Map<String, Object>> defaultCommunityMaps() {
        List<Map<String, Object>> list = new ArrayList<>();
        list.add(enrichIntroDefaults(communityMap("warm-main", "暖阁星球 · 内容创作者",
                "内容创作者的自留地 · 由 墨白 主理", "🪐", true, true, "", ""),
                "这里是内容创作者的自留地。提问有人答，日更有人陪，沉淀都能搜到。\n加入后，你将进入一个更专注、更有反馈的创作小世界。",
                List.of(
                        highlight("💬", "提问必达", "星主与编辑轮流答疑，不让问题沉底"),
                        highlight("⭐", "精华沉淀", "每周精选方法论与实操清单"),
                        highlight("📂", "资料库", "模板、提纲、案例包随手可下")
                ),
                "加入星球", "加入后可提问 · 看精华 · 下资料"));
        list.add(enrichIntroDefaults(communityMap("warm-read", "共读小站",
                "每月一本书，交 300 字笔记", "📖", true, false, "860 位球友", "今日 3 条新动态"),
                "一起读一本好书，交 300 字笔记。不求快，求真有收获。\n适合想建立阅读节奏、和同频伙伴交流的你。",
                List.of(
                        highlight("📅", "月度共读", "固定书单与领读提纲"),
                        highlight("✍️", "笔记打卡", "交 300 字，换一份反馈"),
                        highlight("👥", "小圈互助", "同频读者互相看见")
                ),
                "加入共读", "先逛逛也可以，合适再留下"));
        list.add(enrichIntroDefaults(communityMap("warm-write", "日更互助营",
                "打卡与互评，养写作肌肉", "✍️", false, false, "1,280 位球友", "今日 12 条新动态"),
                "用打卡养肌肉，用互评找手感。每天写一点，圈子里有人看、有人回。\n适合想坚持输出、又不想一个人硬撑的创作者。",
                List.of(
                        highlight("🔥", "日更打卡", "轻量节奏，容易坚持"),
                        highlight("🤝", "互评反馈", "别人看见你的进步"),
                        highlight("🎯", "选题互助", "卡住时有人一起拆")
                ),
                "加入日更营", "可先逛逛动态，再决定加入"));
        return list;
    }

    private List<PlanetCommunityVO> defaultCommunities() {
        return parseCommunities(defaultCommunityMaps());
    }

    private Map<String, Object> highlight(String icon, String title, String desc) {
        Map<String, Object> h = new LinkedHashMap<>();
        h.put("icon", icon);
        h.put("title", title);
        h.put("desc", desc);
        return h;
    }

    private Map<String, Object> enrichIntroDefaults(Map<String, Object> m, String intro,
                                                    List<Map<String, Object>> highlights,
                                                    String ctaText, String joinHint) {
        m.put("intro", intro);
        m.put("highlights", highlights);
        m.put("ctaText", ctaText);
        m.put("joinHint", joinHint);
        String id = String.valueOf(m.get("id"));
        m.put("introUrl", "/pages/planet-intro/planet-intro?planetId=" + id);
        return m;
    }

    private Map<String, Object> communityMap(String id, String title, String subtitle, String emoji,
                                            boolean joined, boolean primary, String members, String today) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("title", title);
        m.put("subtitle", subtitle);
        m.put("emoji", emoji);
        m.put("joined", joined);
        m.put("primary", primary);
        m.put("membersLabel", members);
        m.put("todayLabel", today);
        m.put("cover", "");
        m.put("feedUrl", "/pages/planet-feed/planet-feed?planetId=" + id);
        m.put("homeUrl", "/pages/planet/planet");
        m.put("introUrl", "/pages/planet-intro/planet-intro?planetId=" + id);
        return m;
    }

    private List<PlanetCommunityVO> parseCommunities(Object raw) {
        List<PlanetCommunityVO> out = new ArrayList<>();
        if (!(raw instanceof List<?> list)) return out;
        for (Object o : list) {
            if (!(o instanceof Map<?, ?> m)) continue;
            PlanetCommunityVO vo = new PlanetCommunityVO();
            vo.setId(str(m.get("id"), ""));
            if (!StringUtils.hasText(vo.getId())) continue;
            vo.setTitle(str(m.get("title"), "星球"));
            vo.setSubtitle(str(m.get("subtitle"), ""));
            vo.setCover(str(m.get("cover"), ""));
            vo.setEmoji(str(m.get("emoji"), "🪐"));
            vo.setMembersLabel(str(m.get("membersLabel"), ""));
            vo.setTodayLabel(str(m.get("todayLabel"), ""));
            Object joined = m.get("joined");
            vo.setJoined(joined instanceof Boolean ? (Boolean) joined : !"false".equalsIgnoreCase(String.valueOf(joined)));
            Object primary = m.get("primary");
            vo.setPrimary(primary instanceof Boolean ? (Boolean) primary : "true".equalsIgnoreCase(String.valueOf(primary)));
            Object enabled = m.get("enabled");
            if (enabled == null) {
                vo.setEnabled(true);
            } else {
                vo.setEnabled(enabled instanceof Boolean ? (Boolean) enabled : !"false".equalsIgnoreCase(String.valueOf(enabled)));
            }
            Object sortRaw = m.get("sortOrder");
            if (sortRaw instanceof Number) {
                vo.setSortOrder(((Number) sortRaw).intValue());
            } else if (sortRaw != null && StringUtils.hasText(String.valueOf(sortRaw))) {
                try {
                    vo.setSortOrder(Integer.parseInt(String.valueOf(sortRaw).trim()));
                } catch (NumberFormatException ignored) {
                    vo.setSortOrder(out.size());
                }
            } else {
                vo.setSortOrder(out.size());
            }
            vo.setFeedUrl(str(m.get("feedUrl"), "/pages/planet-feed/planet-feed?planetId=" + vo.getId()));
            vo.setHomeUrl(str(m.get("homeUrl"), "/pages/planet/planet"));
            vo.setIntroUrl(str(m.get("introUrl"), "/pages/planet-intro/planet-intro?planetId=" + vo.getId()));
            vo.setIntro(str(m.get("intro"), ""));
            vo.setCtaText(str(m.get("ctaText"), "加入星球"));
            vo.setJoinHint(str(m.get("joinHint"), ""));
            vo.setHighlights(parseHighlights(m.get("highlights")));
            // 缺省介绍时补默认，避免旧配置空白页
            if (!StringUtils.hasText(vo.getIntro()) || vo.getHighlights() == null || vo.getHighlights().isEmpty()) {
                fillMissingIntroFromDefaults(vo);
            }
            out.add(vo);
        }
        out.sort((a, b) -> {
            int sa = a.getSortOrder() != null ? a.getSortOrder() : 0;
            int sb = b.getSortOrder() != null ? b.getSortOrder() : 0;
            if (sa != sb) return Integer.compare(sa, sb);
            return String.valueOf(a.getId()).compareTo(String.valueOf(b.getId()));
        });
        return out;
    }

    private List<PlanetCommunityVO.Highlight> parseHighlights(Object raw) {
        List<PlanetCommunityVO.Highlight> out = new ArrayList<>();
        if (!(raw instanceof List<?> list)) return out;
        for (Object o : list) {
            if (!(o instanceof Map<?, ?> m)) continue;
            PlanetCommunityVO.Highlight h = new PlanetCommunityVO.Highlight();
            h.setIcon(str(m.get("icon"), "✨"));
            h.setTitle(str(m.get("title"), ""));
            h.setDesc(str(m.get("desc"), ""));
            if (!StringUtils.hasText(h.getTitle()) && !StringUtils.hasText(h.getDesc())) continue;
            out.add(h);
        }
        return out;
    }

    private void fillMissingIntroFromDefaults(PlanetCommunityVO vo) {
        for (PlanetCommunityVO d : parseCommunitiesRawDefaults()) {
            if (vo.getId().equals(d.getId())) {
                if (!StringUtils.hasText(vo.getIntro())) vo.setIntro(d.getIntro());
                if (vo.getHighlights() == null || vo.getHighlights().isEmpty()) {
                    vo.setHighlights(d.getHighlights());
                }
                if (!StringUtils.hasText(vo.getCtaText()) || "加入星球".equals(vo.getCtaText())) {
                    if (StringUtils.hasText(d.getCtaText())) vo.setCtaText(d.getCtaText());
                }
                if (!StringUtils.hasText(vo.getJoinHint())) vo.setJoinHint(d.getJoinHint());
                break;
            }
        }
    }

    /** 仅解析默认 maps，避免 fillMissing 递归 */
    private List<PlanetCommunityVO> parseCommunitiesRawDefaults() {
        List<PlanetCommunityVO> out = new ArrayList<>();
        for (Map<String, Object> m : defaultCommunityMaps()) {
            PlanetCommunityVO vo = new PlanetCommunityVO();
            vo.setId(str(m.get("id"), ""));
            vo.setIntro(str(m.get("intro"), ""));
            vo.setCtaText(str(m.get("ctaText"), "加入星球"));
            vo.setJoinHint(str(m.get("joinHint"), ""));
            vo.setHighlights(parseHighlights(m.get("highlights")));
            out.add(vo);
        }
        return out;
    }

    private void enrichCommunityStats(List<PlanetCommunityVO> list) {
        if (list == null || list.isEmpty()) return;
        long members = planetStatsService.countActiveMembers();
        long today = planetStatsService.countTodayPlanetPosts();
        for (PlanetCommunityVO c : list) {
            if (Boolean.TRUE.equals(c.getPrimary())) {
                if (!StringUtils.hasText(c.getMembersLabel())) {
                    c.setMembersLabel(planetStatsService.applyTemplate("{n} 位球友", members, "{n} 位球友"));
                }
                if (!StringUtils.hasText(c.getTodayLabel())) {
                    c.setTodayLabel(planetStatsService.applyTemplate("今日 {n} 条新动态", today, "今日 {n} 条新动态"));
                }
            }
        }
    }

    private PlanetConfigVO toVo(Map<String, Object> map) {
        PlanetConfigVO vo = new PlanetConfigVO();
        vo.setTitle(str(map.get("title"), "星球"));
        vo.setSubtitle(str(map.get("subtitle"), ""));
        vo.setCoverImage(str(map.get("coverImage"), ""));
        vo.setUnpaidViewMode(normalizeViewMode(str(map.get("unpaidViewMode"), "summary")));
        Object pc = map.get("previewCount");
        vo.setPreviewCount(pc instanceof Number ? ((Number) pc).intValue() : 3);
        vo.setEntryLabel(str(map.get("entryLabel"), "星球"));
        vo.setExpireText(str(map.get("expireText"), ""));
        vo.setKpis(parseKpis(map.get("kpis")));
        vo.setTopics(parseTopics(map.get("topics")));
        vo.setSegs(parseSegs(map.get("segs")));
        Object ops = map.get("ops");
        if (ops instanceof Map<?, ?> opsMap) {
            Map<String, Object> copy = new LinkedHashMap<>();
            opsMap.forEach((k, v) -> copy.put(String.valueOf(k), v));
            vo.setOps(copy);
        }
        return vo;
    }

    private List<PlanetConfigVO.KpiItem> parseKpis(Object raw) {
        List<PlanetConfigVO.KpiItem> out = new ArrayList<>();
        if (!(raw instanceof List<?> list)) return out;
        for (Object o : list) {
            if (!(o instanceof Map<?, ?> m)) continue;
            PlanetConfigVO.KpiItem item = new PlanetConfigVO.KpiItem();
            item.setValue(str(m.get("value"), ""));
            item.setLabel(str(m.get("label"), ""));
            out.add(item);
        }
        return out;
    }

    private List<PlanetConfigVO.TopicItem> parseTopics(Object raw) {
        List<?> list;
        if (raw instanceof List<?> l) {
            list = l;
        } else if (raw instanceof Map<?, ?> map) {
            // 管理端保存形态 { title, note, items: [...] }
            Object items = map.get("items");
            list = items instanceof List<?> il ? il : List.of();
        } else {
            return new ArrayList<>();
        }
        List<PlanetConfigVO.TopicItem> out = new ArrayList<>();
        for (Object o : list) {
            if (!(o instanceof Map<?, ?> m)) continue;
            String name = str(m.get("name"), "");
            if (!StringUtils.hasText(name)) continue;
            PlanetConfigVO.TopicItem item = new PlanetConfigVO.TopicItem();
            item.setName(name);
            Object w = m.get("width");
            item.setWidth(w instanceof Number ? ((Number) w).intValue() : 50);
            item.setPct(str(m.get("pct"), ""));
            Object down = m.get("down");
            item.setDown(down instanceof Boolean ? (Boolean) down : Boolean.FALSE);
            out.add(item);
        }
        return out;
    }

    /**
     * 真实本周热门话题优先；有数据时覆盖配置兜底，无数据则保留配置（空配置 = 前端隐藏）
     */
    private void applyLiveTopics(PlanetConfigVO vo, Long userId, String planetId) {
        String resolved = StringUtils.hasText(planetId) ? planetId.trim() : null;
        if (!StringUtils.hasText(resolved)) {
            MainPlanetVO main = resolveMainPlanet(userId);
            if (main != null && StringUtils.hasText(main.getPlanetId())) {
                resolved = main.getPlanetId().trim();
            }
        }
        String defaultId = resolveDefaultPlanetId();
        List<Map<String, Object>> live = planetStatsService.pickWeeklyHotTopics(resolved, defaultId, 4);
        if (live == null || live.isEmpty()) {
            return;
        }
        List<PlanetConfigVO.TopicItem> items = new ArrayList<>(live.size());
        for (Map<String, Object> row : live) {
            if (row == null) continue;
            String name = str(row.get("name"), "");
            if (!StringUtils.hasText(name)) continue;
            PlanetConfigVO.TopicItem item = new PlanetConfigVO.TopicItem();
            item.setName(name);
            Object w = row.get("width");
            item.setWidth(w instanceof Number ? ((Number) w).intValue() : 50);
            item.setPct(str(row.get("pct"), ""));
            Object down = row.get("down");
            item.setDown(down instanceof Boolean ? (Boolean) down : Boolean.FALSE);
            Object heat = row.get("heat");
            if (heat instanceof Number) {
                item.setHeat(((Number) heat).longValue());
            }
            items.add(item);
        }
        if (!items.isEmpty()) {
            vo.setTopics(items);
        }
    }

    private List<PlanetConfigVO.SegItem> parseSegs(Object raw) {
        List<PlanetConfigVO.SegItem> out = new ArrayList<>();
        if (!(raw instanceof List<?> list)) return out;
        for (Object o : list) {
            if (!(o instanceof Map<?, ?> m)) continue;
            PlanetConfigVO.SegItem item = new PlanetConfigVO.SegItem();
            item.setKey(str(m.get("key"), ""));
            item.setLabel(str(m.get("label"), ""));
            if (!item.getKey().isEmpty()) out.add(item);
        }
        return out;
    }

    private void applyLiveKpis(PlanetConfigVO vo, Map<String, Object> raw) {
        Map<String, Object> ops = new LinkedHashMap<>();
        Object opsRaw = raw != null ? raw.get("ops") : null;
        if (opsRaw instanceof Map<?, ?> m) {
            m.forEach((k, v) -> ops.put(String.valueOf(k), v));
        }
        if (vo.getOps() != null && !vo.getOps().isEmpty()) {
            ops.putAll(vo.getOps());
        }

        boolean membersAuto = isAutoMode(ops.get("membersMode"));
        boolean postsAuto = isAutoMode(ops.get("postsMode"));
        boolean todayAuto = isAutoMode(ops.get("todayMode"));

        long membersN = membersAuto
                ? planetStatsService.countActiveMembers()
                : parseOpsCount(ops.get("kpiMembers"));
        long postsN = postsAuto
                ? planetStatsService.countPlanetPosts()
                : parseOpsCount(ops.get("kpiPosts"));
        long todayN = todayAuto
                ? planetStatsService.countTodayPlanetPosts()
                : parseOpsCount(firstNonBlank(ops.get("kpiTodayFeed"), ops.get("kpiQuestions")));

        List<PlanetConfigVO.KpiItem> kpis = new ArrayList<>();
        kpis.add(kpi(planetStatsService.formatCount(membersN), "球友"));
        kpis.add(kpi(planetStatsService.formatCount(postsN), "沉淀内容"));
        kpis.add(kpi(planetStatsService.formatCount(todayN), "今日新增"));
        // 不自动保留「问必答」等演示 KPI；仅当前三真统计（手工问必答需显式配置后再开）
        vo.setKpis(kpis);
    }

    private PlanetConfigVO.KpiItem kpi(String value, String label) {
        PlanetConfigVO.KpiItem item = new PlanetConfigVO.KpiItem();
        item.setValue(value);
        item.setLabel(label);
        return item;
    }

    private boolean isAutoMode(Object mode) {
        if (mode == null) return true;
        String s = String.valueOf(mode).trim().toLowerCase();
        return s.isEmpty() || "auto".equals(s);
    }

    private long parseOpsCount(Object v) {
        if (v == null) return 0L;
        if (v instanceof Number n) return Math.max(0, n.longValue());
        String digits = String.valueOf(v).replaceAll("[^0-9]", "");
        if (!StringUtils.hasText(digits)) return 0L;
        try {
            return Long.parseLong(digits);
        } catch (Exception e) {
            return 0L;
        }
    }

    private String firstNonBlank(Object a, Object b) {
        String s1 = a == null ? "" : String.valueOf(a).trim();
        if (StringUtils.hasText(s1)) return s1;
        return b == null ? "" : String.valueOf(b).trim();
    }

    private static Map<String, String> kpiItem(String label, Object value) {
        Map<String, String> row = new LinkedHashMap<>();
        row.put("label", label);
        row.put("value", value != null ? String.valueOf(value) : "");
        return row;
    }

    private String normalizeViewMode(String raw) {
        String v = raw == null ? "summary" : raw.trim().toLowerCase();
        return switch (v) {
            case "hidden", "title", "summary", "preview_n" -> v;
            default -> "summary";
        };
    }

    private String str(Object v, String fallback) {
        if (v == null) return fallback;
        String s = String.valueOf(v).trim();
        return s.isEmpty() ? fallback : s;
    }

    private String resolvePlanetIdForHome(Long userId, String planetId) {
        if (StringUtils.hasText(planetId)) {
            return planetId.trim();
        }
        MainPlanetVO main = resolveMainPlanet(userId);
        if (main != null && StringUtils.hasText(main.getPlanetId())) {
            return main.getPlanetId().trim();
        }
        return resolveDefaultPlanetId();
    }

    private boolean hasActiveSubscription(Long userId, String scope, String planetId) {
        List<MemberSubscription> list = memberSubscriptionMapper.selectList(new LambdaQueryWrapper<MemberSubscription>()
                .eq(MemberSubscription::getUserId, userId)
                .eq(MemberSubscription::getScope, scope)
                .eq(MemberSubscription::getStatus, STATUS_ACTIVE));
        if (list == null || list.isEmpty()) {
            return false;
        }
        LocalDateTime now = LocalDateTime.now();
        for (MemberSubscription row : list) {
            if (row.getExpireAt() != null && !row.getExpireAt().isAfter(now)) {
                continue;
            }
            if (SCOPE_PLATFORM.equals(scope)) {
                if (row.getPlanetId() == null || row.getPlanetId().isBlank()) {
                    return true;
                }
            } else if (planetId != null && planetId.equals(row.getPlanetId())) {
                return true;
            }
        }
        return false;
    }

    private long countPlatformSubscriptionRows(Long userId) {
        Long count = memberSubscriptionMapper.selectCount(new LambdaQueryWrapper<MemberSubscription>()
                .eq(MemberSubscription::getUserId, userId)
                .eq(MemberSubscription::getScope, SCOPE_PLATFORM));
        return count == null ? 0L : count;
    }

    /**
     * 迁移前兼容（无任何平台订购行时）：
     * <ul>
     *   <li>有 {@code member_expire_at} 且未过期 → 有效</li>
     *   <li>{@code member_expire_at == null} 且存在付费会员订单（与 Migrator 同判定）→ 终身有效</li>
     *   <li>仅有成长 {@code level_id}、无 expire、无会员订单 → 无效（禁止当终身）</li>
     * </ul>
     */
    private boolean legacyPlatformActive(User user) {
        if (user == null) {
            return false;
        }
        LocalDateTime expireAt = user.getMemberExpireAt();
        if (expireAt != null) {
            return expireAt.isAfter(LocalDateTime.now());
        }
        // null expire：须有付费会员订单证据，禁止仅凭成长 level_id 当终身
        return user.getId() != null && hasPaidMembershipOrder(user.getId());
    }

    /**
     * 是否存在付费会员订单证据（product_type=membership 且订单 status∈paid/shipped/completed）。
     * 判定与 {@link com.miniprogram.support.MembershipSubscriptionMigrator} 一致。
     */
    private boolean hasPaidMembershipOrder(Long userId) {
        AtomicBoolean found = new AtomicBoolean(false);
        MpTenantLineHandler.runWithoutTenant(() -> {
            List<Product> membershipProducts = productMapper.selectList(
                    new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<Product>()
                            .and(w -> w.eq("product_type", ProductTypes.MEMBERSHIP)
                                    .or()
                                    .like("product_types", ProductTypes.MEMBERSHIP)));
            if (membershipProducts == null || membershipProducts.isEmpty()) {
                return;
            }
            Set<Long> productIds = membershipProducts.stream()
                    .filter(p -> p.getId() != null)
                    .filter(p -> ProductTypes.isMembership(p.getProductType(), p.getProductTypes()))
                    .map(Product::getId)
                    .collect(Collectors.toSet());
            if (productIds.isEmpty()) {
                return;
            }
            List<Order> paidOrders = orderMapper.selectList(
                    new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<Order>()
                            .eq("user_id", userId)
                            .in("status", PAID_ORDER_STATUSES));
            if (paidOrders == null || paidOrders.isEmpty()) {
                return;
            }
            Set<Long> orderIds = paidOrders.stream()
                    .map(Order::getId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            if (orderIds.isEmpty()) {
                return;
            }
            Long count = orderItemMapper.selectCount(
                    new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<OrderItem>()
                            .in("order_id", orderIds)
                            .in("product_id", productIds));
            found.set(count != null && count > 0);
        });
        return found.get();
    }

    private LocalDateTime findActiveExpireAtInternal(Long userId, String scope, String planetId) {
        LambdaQueryWrapper<MemberSubscription> w = new LambdaQueryWrapper<>();
        w.eq(MemberSubscription::getUserId, userId)
                .eq(MemberSubscription::getScope, scope)
                .eq(MemberSubscription::getStatus, STATUS_ACTIVE)
                .and(x -> x.isNull(MemberSubscription::getExpireAt)
                        .or()
                        .gt(MemberSubscription::getExpireAt, LocalDateTime.now()))
                .orderByDesc(MemberSubscription::getExpireAt)
                .last("LIMIT 1");
        if (SCOPE_PLATFORM.equals(scope)) {
            w.and(x -> x.isNull(MemberSubscription::getPlanetId)
                    .or()
                    .eq(MemberSubscription::getPlanetId, ""));
        } else if (StringUtils.hasText(planetId)) {
            w.eq(MemberSubscription::getPlanetId, planetId);
        }
        MemberSubscription row = memberSubscriptionMapper.selectOne(w);
        return row == null ? null : row.getExpireAt();
    }

    /**
     * 写入/续期订购行；返回最终 expireAt（null=终身）。
     * 续期：base = max(now, currentActive.expireAt)；days&lt;=0 → 终身。
     */
    private LocalDateTime upsertSubscription(Long userId, String scope, String planetId,
                                             Long planId, Long orderId, String source, Integer membershipDays) {
        int days = membershipDays == null ? 0 : membershipDays;
        LocalDateTime now = LocalDateTime.now();
        MemberSubscription existing = findLatestActiveSubscription(userId, scope, planetId);
        LocalDateTime expireAt;
        if (days <= 0) {
            expireAt = null;
        } else {
            // base = max(now, currentActive.expireAt ?? now)
            LocalDateTime base = now;
            if (existing != null && existing.getExpireAt() != null && existing.getExpireAt().isAfter(now)) {
                base = existing.getExpireAt();
            }
            expireAt = base.plusDays(days);
        }
        if (existing != null) {
            existing.setPlanId(planId);
            if (orderId != null) {
                existing.setOrderId(orderId);
            }
            existing.setSource(source);
            existing.setStatus(STATUS_ACTIVE);
            if (existing.getStartAt() == null) {
                existing.setStartAt(now);
            }
            existing.setExpireAt(expireAt);
            memberSubscriptionMapper.updateById(existing);
        } else {
            MemberSubscription row = new MemberSubscription();
            row.setUserId(userId);
            row.setScope(scope);
            row.setPlanetId(planetId);
            row.setPlanId(planId);
            row.setOrderId(orderId);
            row.setSource(source);
            row.setStartAt(now);
            row.setExpireAt(expireAt);
            row.setStatus(STATUS_ACTIVE);
            memberSubscriptionMapper.insert(row);
        }
        return expireAt;
    }

    /** 续期用：最新 active 行；无则 insert 新行 */
    private MemberSubscription findLatestActiveSubscription(Long userId, String scope, String planetId) {
        LambdaQueryWrapper<MemberSubscription> w = new LambdaQueryWrapper<>();
        w.eq(MemberSubscription::getUserId, userId)
                .eq(MemberSubscription::getScope, scope)
                .eq(MemberSubscription::getStatus, STATUS_ACTIVE)
                .orderByDesc(MemberSubscription::getId)
                .last("LIMIT 1");
        if (SCOPE_PLATFORM.equals(scope)) {
            w.and(x -> x.isNull(MemberSubscription::getPlanetId)
                    .or()
                    .eq(MemberSubscription::getPlanetId, ""));
        } else {
            w.eq(MemberSubscription::getPlanetId, planetId);
        }
        return memberSubscriptionMapper.selectOne(w);
    }

    private void mirrorPlatformExpire(Long userId, LocalDateTime expireAt) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            return;
        }
        user.setMemberExpireAt(expireAt);
        userMapper.updateById(user);
    }

    /** 当前有效平台订购绑定的付费档；无订购/无 planId/档不存在 → null */
    @Override
    public MembershipPlan findActivePlatformPlan(Long userId) {
        MemberSubscription sub = findLatestActiveSubscription(userId, SCOPE_PLATFORM, null);
        if (sub == null || sub.getPlanId() == null) {
            return null;
        }
        if (sub.getExpireAt() != null && !sub.getExpireAt().isAfter(LocalDateTime.now())) {
            return null;
        }
        return membershipPlanMapper.selectById(sub.getPlanId());
    }

    private boolean hasBenefitFromGrowthLevel(Long userId, String code) {
        User user = userMapper.selectById(userId);
        if (user == null || user.getLevelId() == null) {
            return false;
        }
        MemberLevel level = memberLevelMapper.selectById(user.getLevelId());
        if (level == null) {
            return false;
        }
        List<String> benefits = MemberBenefitCodes.normalize(level.getRights());
        return MemberBenefitCodes.has(benefits, code);
    }

    /** @return 折扣后价格；rate 无效时 null */
    private static BigDecimal applyDiscountRate(BigDecimal base, BigDecimal rate) {
        if (base == null || rate == null) {
            return null;
        }
        if (rate.compareTo(BigDecimal.ZERO) <= 0 || rate.compareTo(BigDecimal.ONE) >= 0) {
            return null;
        }
        return base.multiply(rate).setScale(2, RoundingMode.HALF_UP);
    }

    private static String trimToNull(String s) {
        if (!StringUtils.hasText(s)) {
            return null;
        }
        return s.trim();
    }
}
