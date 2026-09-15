package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.dto.home.WarmHomeVO;
import com.miniprogram.entity.Content;
import com.miniprogram.entity.Product;
import com.miniprogram.mapper.ContentMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.service.SystemConfigService;
import com.miniprogram.service.WarmHomeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class WarmHomeServiceImpl implements WarmHomeService {

    public static final String CONFIG_KEY = "warm_home_config";

    private final SystemConfigService systemConfigService;
    private final ContentMapper contentMapper;
    private final ProductMapper productMapper;
    private final ObjectMapper objectMapper;

    @Override
    public WarmHomeVO getWarmHome() {
        Map<String, Object> cfg = readConfig();
        WarmHomeVO vo = new WarmHomeVO();
        vo.setGreetTemplate(str(cfg.get("greetTemplate"), "你好"));
        vo.setStreakDays(asInt(cfg.get("streakDays"), 0));
        vo.setTodayCount(asInt(cfg.get("todayCount"), 0));
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
            card.setMeta(str(ref.get("meta"), buildMeta(c)));
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
        WarmHomeVO.PlanetBrief brief = new WarmHomeVO.PlanetBrief();
        if (!(raw instanceof Map<?, ?> map)) {
            brief.setTitle("暖阁星球");
            brief.setMembers("");
            brief.setCta("去看看");
            return brief;
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> m = (Map<String, Object>) map;
        brief.setTitle(str(m.get("title"), "暖阁星球"));
        brief.setMembers(str(m.get("members"), ""));
        brief.setCta(str(m.get("cta"), "去看看"));
        brief.setItems(asMapList(m.get("items")));
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

    private String buildMeta(Content c) {
        String author = StringUtils.hasText(c.getAuthor()) ? c.getAuthor() : "暖阁";
        String views = c.getViewCount() != null ? c.getViewCount() + " 阅读" : "";
        return StringUtils.hasText(views) ? author + " · " + views : author;
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
