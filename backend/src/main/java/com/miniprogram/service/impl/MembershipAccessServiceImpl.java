package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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
        Map<String, Object> raw = readConfigMap();
        PlanetConfigVO vo = toVo(raw);
        vo.setEnabled(featureModuleGuard.isEnabled("planet"));
        boolean active = hasActivePaidMembership(userId);
        vo.setMemberActive(active);
        if (userId != null) {
            User user = userMapper.selectById(userId);
            if (user != null) {
                vo.setMemberLevelId(user.getLevelId());
                if (user.getMemberExpireAt() != null) {
                    vo.setMemberExpireAt(user.getMemberExpireAt().format(FMT));
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
        return vo;
    }

    @Override
    public PlanetConfigVO getAdminPlanetConfig() {
        PlanetConfigVO vo = toVo(readConfigMap());
        vo.setEnabled(featureModuleGuard.isEnabled("planet"));
        vo.setPackages(listPackages());
        return vo;
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
        return map;
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
        List<PlanetConfigVO.TopicItem> out = new ArrayList<>();
        if (!(raw instanceof List<?> list)) return out;
        for (Object o : list) {
            if (!(o instanceof Map<?, ?> m)) continue;
            PlanetConfigVO.TopicItem item = new PlanetConfigVO.TopicItem();
            item.setName(str(m.get("name"), ""));
            Object w = m.get("width");
            item.setWidth(w instanceof Number ? ((Number) w).intValue() : 50);
            item.setPct(str(m.get("pct"), ""));
            Object down = m.get("down");
            item.setDown(down instanceof Boolean ? (Boolean) down : Boolean.FALSE);
            out.add(item);
        }
        return out;
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
