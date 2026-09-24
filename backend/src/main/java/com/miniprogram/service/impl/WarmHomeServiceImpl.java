package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.dto.home.WarmHomeVO;
import com.miniprogram.entity.Content;
import com.miniprogram.entity.Product;
import com.miniprogram.mapper.ContentMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.service.PlanetStatsService;
import com.miniprogram.service.SystemConfigService;
import com.miniprogram.service.WarmHomeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class WarmHomeServiceImpl implements WarmHomeService {

    public static final String CONFIG_KEY = "warm_home_config";
    private static final String PLANET_CONFIG_KEY = "planet_config";

    private final SystemConfigService systemConfigService;
    private final ContentMapper contentMapper;
    private final ProductMapper productMapper;
    private final PlanetStatsService planetStatsService;
    private final ObjectMapper objectMapper;

    @Override
    public WarmHomeVO getWarmHome() {
        Map<String, Object> cfg = readConfig();
        WarmHomeVO vo = new WarmHomeVO();
        vo.setGreetTemplate(str(cfg.get("greetTemplate"), "你好"));
        vo.setStreakDays(asInt(cfg.get("streakDays"), 0));
        vo.setTodayCount(resolveTodayCount(cfg));
        vo.setNavs(asMapList(cfg.get("navs")));
        vo.setAuthors(asMapList(cfg.get("authors")));
        vo.setSegs(asMapList(cfg.get("segs")));
        vo.setPlanet(buildPlanet(cfg.get("planet")));
        vo.setVipBar(buildVipBar(cfg.get("vipBar")));

        Long featureId = asLong(cfg.get("featureContentId"));
        if (featureId != null) {
            Content c = contentMapper.selectById(featureId);
            if (c != null && "published".equals(c.getStatus())) {
                WarmHomeVO.FeatureCard f = new WarmHomeVO.FeatureCard();
                f.setContentId(c.getId());
                f.setTag(str(cfg.get("featureTag"), "今日精选"));
                f.setTitle(c.getTitle());
                f.setCover(c.getCoverImage());
                f.setContentType(c.getContentType());
                List<String> meta = asStringList(cfg.get("featureMeta"));
                if (meta.isEmpty()) {
                    meta = List.of(
                            StringUtils.hasText(c.getAuthor()) ? c.getAuthor() : "暖阁",
                            c.getViewCount() != null ? c.getViewCount() + " 阅读" : ""
                    );
                }
                f.setMeta(meta.stream().filter(StringUtils::hasText).toList());
                vo.setFeature(f);
            }
        }

        List<Long> columnIds = asLongList(cfg.get("columnProductIds"));
        List<WarmHomeVO.ColumnCard> columns = new ArrayList<>();
        for (Long pid : columnIds) {
            Product p = productMapper.selectById(pid);
            if (p == null || !"on_sale".equals(p.getStatus())) continue;
            Map<String, Object> meta = findColumnMeta(cfg, pid);
            WarmHomeVO.ColumnCard card = new WarmHomeVO.ColumnCard();
            card.setProductId(p.getId());
            String titleOverride = str(meta.get("title"), "");
            card.setTitle(StringUtils.hasText(titleOverride) ? titleOverride : shortColumnTitle(p.getName()));
            card.setCover(str(meta.get("cover"), p.getMainImage()));
            String descOverride = str(meta.get("desc"), "");
            card.setDesc(StringUtils.hasText(descOverride) ? descOverride : str(p.getDescription(), ""));
            card.setPrice(formatPrice(p.getPrice()));
            card.setOrigin(p.getOriginalPrice() != null ? formatPrice(p.getOriginalPrice()) : "");
            card.setBadge(str(meta.get("badge"), ""));
            Object gold = meta.get("badgeGold");
            card.setBadgeGold(gold instanceof Boolean ? (Boolean) gold : Boolean.FALSE);
            columns.add(card);
        }
        vo.setColumns(columns);

        List<Map<String, Object>> feedRefs = asMapList(cfg.get("feed"));
        List<WarmHomeVO.FeedCard> feed = new ArrayList<>();
        for (Map<String, Object> ref : feedRefs) {
            Long cid = asLong(ref.get("contentId"));
            if (cid == null) continue;
            Content c = contentMapper.selectById(cid);
            if (c == null || !"published".equals(c.getStatus())) continue;
            WarmHomeVO.FeedCard card = new WarmHomeVO.FeedCard();
            card.setContentId(c.getId());
            card.setSeg(str(ref.get("seg"), "article"));
            card.setType(str(ref.get("type"), "post"));
            card.setTitle(c.getTitle());
            card.setSummary(c.getSummary());
            card.setTag(str(ref.get("tag"), ""));
            card.setTagGold(Boolean.TRUE.equals(ref.get("tagGold")));
            String globalMode = str(cfg.get("feedStatsMode"), "auto");
            String itemMode = str(ref.get("metaMode"), globalMode);
            boolean useManual = "manual".equalsIgnoreCase(itemMode)
                    && StringUtils.hasText(str(ref.get("meta"), ""));
            if (useManual) {
                card.setMeta(str(ref.get("meta"), ""));
            } else {
                card.setMeta(buildMeta(c, str(ref.get("seg"), "article")));
            }
            card.setCover(c.getCoverImage());
            card.setContentType(c.getContentType());
            card.setImages(parseImages(c.getImages()));
            if (card.getImages().isEmpty() && ref.get("images") instanceof List<?> imgList) {
                List<String> fromCfg = new ArrayList<>();
                for (Object o : imgList) {
                    if (o != null && StringUtils.hasText(String.valueOf(o))) {
                        fromCfg.add(String.valueOf(o));
                    }
                }
                card.setImages(fromCfg);
            }
            feed.add(card);
        }
        vo.setFeed(feed);
        return vo;
    }

    private WarmHomeVO.PlanetBrief buildPlanet(Object raw) {
        Map<String, Object> warmPlanet = raw instanceof Map<?, ?>
                ? castMap(raw)
                : new LinkedHashMap<>();
        Map<String, Object> planetCfg = readPlanetConfig();
        Map<String, Object> ops = castMap(planetCfg.get("ops"));

        WarmHomeVO.PlanetBrief brief = new WarmHomeVO.PlanetBrief();
        String title = firstNonBlank(
                str(ops.get("homeCardTitle"), ""),
                str(warmPlanet.get("title"), ""),
                str(planetCfg.get("title"), ""),
                "暖阁星球");
        brief.setTitle(title);

        boolean membersAuto = isAuto(ops.get("membersMode"));
        long membersN = membersAuto
                ? planetStatsService.countActiveMembers()
                : parseCount(ops.get("kpiMembers"), warmPlanet.get("members"));
        brief.setMembers(planetStatsService.applyTemplate(
                str(ops.get("membersTemplate"), ""),
                membersN,
                "{n} 位球友"));

        boolean todayAuto = isAuto(ops.get("todayMode"));
        long todayN = todayAuto
                ? planetStatsService.countTodayPlanetPosts()
                : parseCount(firstNonBlank(str(ops.get("kpiTodayFeed"), ""), str(ops.get("kpiQuestions"), "")),
                warmPlanet.get("cta"));
        brief.setCta(planetStatsService.applyTemplate(
                str(ops.get("ctaTemplate"), ""),
                todayN,
                "今日 {n} 条新动态 · 去看看"));

        boolean itemsAuto = isAuto(ops.get("itemsMode"));
        if (itemsAuto) {
            brief.setItems(planetStatsService.pickHomeTopicItems());
        } else {
            List<Map<String, Object>> fixed = asMapList(ops.get("homeItems"));
            if (fixed.isEmpty()) {
                fixed = asMapList(warmPlanet.get("items"));
            }
            brief.setItems(fixed);
        }
        return brief;
    }

    private WarmHomeVO.VipBar buildVipBar(Object raw) {
        if (!(raw instanceof Map<?, ?> map)) return null;
        @SuppressWarnings("unchecked")
        Map<String, Object> m = (Map<String, Object>) map;
        WarmHomeVO.VipBar bar = new WarmHomeVO.VipBar();
        Long productId = asLong(m.get("productId"));
        bar.setProductId(productId);
        bar.setIcon(str(m.get("icon"), "🎫"));
        bar.setTitle(str(m.get("title"), "开通年度会员"));
        bar.setDesc(str(m.get("desc"), ""));
        bar.setUnit(str(m.get("unit"), "年"));
        if (productId != null) {
            Product p = productMapper.selectById(productId);
            if (p != null) {
                bar.setProductName(p.getName());
                bar.setPrice(formatPrice(p.getPrice()));
                bar.setPriceLabel(str(m.get("priceLabel"), "¥" + formatPrice(p.getPrice()) + "/" + bar.getUnit()));
                return bar;
            }
        }
        bar.setProductName(str(m.get("productName"), ""));
        bar.setPrice(str(m.get("price"), ""));
        bar.setPriceLabel(str(m.get("priceLabel"), ""));
        return bar;
    }

    private Map<String, Object> readPlanetConfig() {
        String raw = systemConfigService.getConfigValue(PLANET_CONFIG_KEY, "");
        if (!StringUtils.hasText(raw)) {
            return new LinkedHashMap<>();
        }
        try {
            return objectMapper.readValue(raw, new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("planet_config 解析失败: {}", e.getMessage());
            return new LinkedHashMap<>();
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castMap(Object raw) {
        if (raw instanceof Map<?, ?> m) {
            return (Map<String, Object>) m;
        }
        return new LinkedHashMap<>();
    }

    private boolean isAuto(Object mode) {
        if (mode == null) return true;
        String s = String.valueOf(mode).trim().toLowerCase();
        return s.isEmpty() || "auto".equals(s);
    }

    private long parseCount(Object primary, Object fallbackText) {
        Long fromPrimary = tryParseLong(primary);
        if (fromPrimary != null) return Math.max(0, fromPrimary);
        if (fallbackText == null) return 0L;
        String digits = String.valueOf(fallbackText).replaceAll("[^0-9]", "");
        if (!StringUtils.hasText(digits)) return 0L;
        try {
            return Long.parseLong(digits);
        } catch (Exception e) {
            return 0L;
        }
    }

    private Long tryParseLong(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.longValue();
        String s = String.valueOf(v).trim().replace(",", "");
        if (!StringUtils.hasText(s)) return null;
        try {
            return Long.parseLong(s.replaceAll("[^0-9]", ""));
        } catch (Exception e) {
            return null;
        }
    }

    private String firstNonBlank(String... vals) {
        if (vals == null) return "";
        for (String v : vals) {
            if (StringUtils.hasText(v)) return v.trim();
        }
        return "";
    }

    private Map<String, Object> findColumnMeta(Map<String, Object> cfg, Long productId) {
        for (Map<String, Object> row : asMapList(cfg.get("columnMeta"))) {
            if (productId.equals(asLong(row.get("productId")))) {
                return row;
            }
        }
        return Map.of();
    }

    private List<String> parseImages(String raw) {
        if (!StringUtils.hasText(raw)) return new ArrayList<>();
        try {
            List<String> list = objectMapper.readValue(raw, new TypeReference<>() {});
            return list != null ? list.stream().filter(StringUtils::hasText).toList() : new ArrayList<>();
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    /** 首页横滑卡用短标题：去掉「 · 32 讲」等后缀，对齐原型 */
    private String shortColumnTitle(String name) {
        if (!StringUtils.hasText(name)) return "";
        int idx = name.indexOf('·');
        if (idx > 0) {
            return name.substring(0, idx).trim();
        }
        return name.trim();
    }

    private String formatCompact(long n) {
        if (n >= 10000) {
            double v = n / 10000.0;
            String s = String.format(java.util.Locale.ROOT, "%.1f", v).replace(".0", "");
            return s + "万";
        }
        if (n >= 1000) {
            double v = n / 1000.0;
            String s = String.format(java.util.Locale.ROOT, "%.1f", v).replace(".0", "");
            return s + "k";
        }
        return String.valueOf(Math.max(0, n));
    }

    private String roleLabel(String role) {
        if (!StringUtils.hasText(role)) return "";
        return switch (role) {
            case "owner" -> "主理人";
            case "contributor" -> "特约";
            case "editor" -> "官方";
            default -> role;
        };
    }

    private String buildMeta(Content c) {
        return buildMeta(c, c != null ? c.getContentType() : "article");
    }

    private String buildMeta(Content c, String seg) {
        if (c == null) return "暖阁";
        String author = StringUtils.hasText(c.getAuthor()) ? c.getAuthor() : "暖阁";
        String role = roleLabel(c.getAuthorRole());
        String head = StringUtils.hasText(role) ? author + " · " + role : author;
        boolean noteLike = "note".equalsIgnoreCase(seg)
                || "note".equalsIgnoreCase(c.getContentType());
        if (noteLike) {
            long likes = c.getLikeCount() != null ? c.getLikeCount() : 0L;
            if (likes <= 0 && c.getViewCount() != null) likes = c.getViewCount();
            return likes > 0 ? head + " · ❤ " + formatCompact(likes) : head;
        }
        long views = c.getViewCount() != null ? c.getViewCount() : 0L;
        if (views <= 0 && c.getLikeCount() != null) views = c.getLikeCount();
        if (views >= 10000) {
            return head + " · " + formatCompact(views) + " 阅读";
        }
        return views > 0 ? head + " · " + formatCompact(views) + " 阅读" : head;
    }

    private int resolveTodayCount(Map<String, Object> cfg) {
        String mode = str(cfg.get("todayCountMode"), "auto");
        if ("manual".equalsIgnoreCase(mode)) {
            return asInt(cfg.get("todayCount"), 0);
        }
        return (int) Math.min(Integer.MAX_VALUE, countTodayPublishedContents());
    }

    /** 按东八区自然日统计当日上架内容数，避免配置项与列表竞态导致数字跳动 */
    private long countTodayPublishedContents() {
        ZoneId zone = ZoneId.of("Asia/Shanghai");
        LocalDate today = LocalDate.now(zone);
        LocalDateTime start = today.atStartOfDay();
        LocalDateTime end = today.plusDays(1).atStartOfDay();
        Long n = contentMapper.selectCount(new LambdaQueryWrapper<Content>()
                .eq(Content::getStatus, "published")
                .ge(Content::getPublishedAt, start)
                .lt(Content::getPublishedAt, end));
        return n != null ? n : 0L;
    }

    private Map<String, Object> readConfig() {
        String raw = systemConfigService.getConfigValue(CONFIG_KEY, "");
        if (!StringUtils.hasText(raw)) {
            return new LinkedHashMap<>();
        }
        try {
            return objectMapper.readValue(raw, new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("warm_home_config 解析失败: {}", e.getMessage());
            return new LinkedHashMap<>();
        }
    }

    private List<Map<String, Object>> asMapList(Object raw) {
        if (!(raw instanceof List<?> list)) return new ArrayList<>();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object o : list) {
            if (o instanceof Map<?, ?> m) {
                @SuppressWarnings("unchecked")
                Map<String, Object> cast = (Map<String, Object>) m;
                out.add(cast);
            }
        }
        return out;
    }

    private List<String> asStringList(Object raw) {
        if (!(raw instanceof List<?> list)) return new ArrayList<>();
        List<String> out = new ArrayList<>();
        for (Object o : list) {
            if (o != null) out.add(String.valueOf(o));
        }
        return out;
    }

    private List<Long> asLongList(Object raw) {
        if (!(raw instanceof List<?> list)) return new ArrayList<>();
        List<Long> out = new ArrayList<>();
        for (Object o : list) {
            Long v = asLong(o);
            if (v != null) out.add(v);
        }
        return out;
    }

    private Long asLong(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(String.valueOf(v).trim());
        } catch (Exception e) {
            return null;
        }
    }

    private int asInt(Object v, int fallback) {
        if (v instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(String.valueOf(v).trim());
        } catch (Exception e) {
            return fallback;
        }
    }

    private String str(Object v, String fallback) {
        if (v == null) return fallback;
        String s = String.valueOf(v).trim();
        return s.isEmpty() ? fallback : s;
    }

    private String formatPrice(BigDecimal price) {
        if (price == null) return "0";
        return price.stripTrailingZeros().toPlainString();
    }
}
