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
import com.miniprogram.entity.Product;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.MemberLevelMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.member.MemberBenefitCodes;
import com.miniprogram.product.ProductTypes;
import com.miniprogram.service.MembershipAccessService;
import com.miniprogram.service.PlanetStatsService;
import com.miniprogram.service.SystemConfigService;
import com.miniprogram.support.FeatureModuleGuard;
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

@Slf4j
@Service
@RequiredArgsConstructor
public class MembershipAccessServiceImpl implements MembershipAccessService {

    private static final String CONFIG_KEY = "planet_config";
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final UserMapper userMapper;
    private final MemberLevelMapper memberLevelMapper;
    private final ProductMapper productMapper;
    private final SystemConfigService systemConfigService;
    private final FeatureModuleGuard featureModuleGuard;
    private final PlanetStatsService planetStatsService;
    private final ObjectMapper objectMapper;

    @Override
    public boolean hasActivePaidMembership(Long userId) {
        if (userId == null) {
            return false;
        }
        return hasActivePaidMembership(userMapper.selectById(userId));
    }

    @Override
    public boolean hasActivePaidMembership(User user) {
        if (user == null || user.getLevelId() == null) {
            return false;
        }
        LocalDateTime expireAt = user.getMemberExpireAt();
        if (expireAt == null) {
            return true;
        }
        return expireAt.isAfter(LocalDateTime.now());
    }

    @Override
    public boolean hasBenefit(Long userId, String code) {
        if (userId == null || !StringUtils.hasText(code) || !hasActivePaidMembership(userId)) {
            return false;
        }
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

    @Override
    public BigDecimal applyShopPrice(Long userId, Product product, BigDecimal listPrice) {
        BigDecimal base = listPrice != null ? listPrice : BigDecimal.ZERO;
        if (product == null || !hasActivePaidMembership(userId)) {
            return base;
        }
        if (Integer.valueOf(1).equals(product.getMemberFree())) {
            return BigDecimal.ZERO;
        }
        if (product.getMemberPrice() != null && product.getMemberPrice().compareTo(BigDecimal.ZERO) >= 0) {
            return product.getMemberPrice();
        }
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
        BigDecimal rate = level.getDiscountRate();
        if (rate.compareTo(BigDecimal.ZERO) <= 0 || rate.compareTo(BigDecimal.ONE) >= 0) {
            return base;
        }
        return base.multiply(rate).setScale(2, RoundingMode.HALF_UP);
    }

    @Override
    public void grantMembership(Long userId, Long levelId, Integer membershipDays) {
        if (userId == null || levelId == null) {
            return;
        }
        User user = userMapper.selectById(userId);
        if (user == null) {
            return;
        }
        user.setLevelId(levelId);
        int days = membershipDays == null ? 0 : Math.max(membershipDays, 0);
        MemberLevel level = memberLevelMapper.selectById(levelId);
        int gift = level != null && level.getGiftPlanetDays() != null ? Math.max(0, level.getGiftPlanetDays()) : 0;
        if (days <= 0) {
            user.setMemberExpireAt(null);
        } else {
            LocalDateTime base = user.getMemberExpireAt();
            if (base == null || base.isBefore(LocalDateTime.now())) {
                base = LocalDateTime.now();
            }
            user.setMemberExpireAt(base.plusDays(days + gift));
        }
        userMapper.updateById(user);
        log.info("开通付费会员 userId={} levelId={} days={} gift={}", userId, levelId, days, gift);
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
        boolean active = hasActivePaidMembership(userId);
        vo.setMemberActive(active);
        vo.setExpireText("");
        if (userId != null) {
            User user = userMapper.selectById(userId);
            if (user != null) {
                vo.setMemberLevelId(user.getLevelId());
                if (user.getMemberExpireAt() != null) {
                    vo.setMemberExpireAt(user.getMemberExpireAt().format(FMT));
                    if (active) {
                        vo.setExpireText("会员有效期至 " + user.getMemberExpireAt().toLocalDate());
                    }
                }
                if (user.getLevelId() != null) {
                    MemberLevel level = memberLevelMapper.selectById(user.getLevelId());
                    if (level != null) {
                        vo.setMemberLevelName(level.getName());
                    }
                }
            }
        }
        vo.setPackages(listPackages());
        applyLiveKpis(vo, raw);
        applyLiveTopics(vo, userId, planetId);
        return vo;
    }

    @Override
    public PlanetConfigVO getAdminPlanetConfig() {
        Map<String, Object> raw = readConfigMap();
        PlanetConfigVO vo = toVo(raw);
        vo.setEnabled(featureModuleGuard.isEnabled("planet"));
        vo.setPackages(listPackages());
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
        vo.setCommunities(listCommunities(null));
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

    private List<PlanetConfigVO.PlanetPackageVO> listPackages() {
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
}
