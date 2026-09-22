package com.miniprogram.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.entity.*;
import com.miniprogram.mapper.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CommerceOpsService {

    private static final DateTimeFormatter DT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final OrderMapper orderMapper;
    private final OrderItemMapper orderItemMapper;
    private final ProductMapper productMapper;
    private final RefundMapper refundMapper;
    private final ProductFlashPriceMapper flashPriceMapper;
    private final SystemConfigMapper systemConfigMapper;
    private final UserNoticeService userNoticeService;
    private final CouponService couponService;
    private final ObjectMapper objectMapper;

    public Map<String, Object> overview() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime monthStart = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);

        List<Order> paidMonth = orderMapper.selectList(new LambdaQueryWrapper<Order>()
                .in(Order::getStatus, List.of("paid", "shipped", "completed"))
                .and(w -> w.isNull(Order::getIsTest).or().eq(Order::getIsTest, 0))
                .ge(Order::getPaidAt, monthStart));
        BigDecimal revenue = paidMonth.stream()
                .map(o -> o.getPayAmount() == null ? BigDecimal.ZERO : o.getPayAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long createdMonth = orderMapper.selectCount(new LambdaQueryWrapper<Order>()
                .and(w -> w.isNull(Order::getIsTest).or().eq(Order::getIsTest, 0))
                .ge(Order::getCreatedAt, monthStart));
        long paidCount = paidMonth.size();
        String payRate = createdMonth <= 0 ? "0%" :
                (BigDecimal.valueOf(paidCount * 1000L / createdMonth).divide(BigDecimal.TEN, 1, RoundingMode.HALF_UP) + "%");
        BigDecimal aov = paidCount == 0 ? BigDecimal.ZERO :
                revenue.divide(BigDecimal.valueOf(paidCount), 2, RoundingMode.HALF_UP);

        long onSale = productMapper.selectCount(new LambdaQueryWrapper<Product>()
                .eq(Product::getStatus, "on_sale")
                .and(w -> w.isNull(Product::getIsTest).or().eq(Product::getIsTest, 0)));

        long refundPending = refundMapper.selectCount(new LambdaQueryWrapper<Refund>()
                .eq(Refund::getStatus, "pending"));
        long pendingShip = orderMapper.selectCount(new LambdaQueryWrapper<Order>()
                .eq(Order::getStatus, "paid")
                .and(w -> w.isNull(Order::getIsTest).or().eq(Order::getIsTest, 0)));
        long unpaid = orderMapper.selectCount(new LambdaQueryWrapper<Order>()
                .eq(Order::getStatus, "pending_payment")
                .and(w -> w.isNull(Order::getIsTest).or().eq(Order::getIsTest, 0)));

        List<Map<String, Object>> tiles = List.of(
                tile("本月实收", "¥" + revenue.setScale(2, RoundingMode.HALF_UP), "排除测试单"),
                tile("付款率", payRate, "本月下单→付款"),
                tile("客单价", "¥" + aov, "已付款订单"),
                tile("在售商品", onSale, "非测试")
        );

        List<Map<String, Object>> todos = new ArrayList<>();
        todos.add(todo("refund", "退款待审", refundPending, "尽快处理", "/commerce/orders?tab=refund"));
        todos.add(todo("ship", "待发货", pendingShip, "实物订单", "/commerce/orders?status=paid"));
        todos.add(todo("unpaid", "未付款可召回", unpaid, "可发站内通知", "/commerce/orders?status=pending_payment"));
        todos.add(todo("health", "数据健康", 0, "见增长数据", "/commerce/growth"));

        List<Map<String, Object>> funnel = List.of(
                Map.of("label", "下单", "value", createdMonth),
                Map.of("label", "付款", "value", paidCount)
        );

        Map<Long, BigDecimal> revByProduct = new HashMap<>();
        Map<Long, Integer> cntByProduct = new HashMap<>();
        Map<Long, String> nameByProduct = new HashMap<>();
        for (Order o : paidMonth) {
            List<OrderItem> items = orderItemMapper.selectList(new LambdaQueryWrapper<OrderItem>()
                    .eq(OrderItem::getOrderId, o.getId()));
            for (OrderItem it : items) {
                if (it.getProductId() == null) continue;
                BigDecimal line = it.getSubtotal() != null ? it.getSubtotal()
                        : (it.getPrice() == null ? BigDecimal.ZERO : it.getPrice().multiply(BigDecimal.valueOf(it.getQuantity() == null ? 1 : it.getQuantity())));
                revByProduct.merge(it.getProductId(), line, BigDecimal::add);
                cntByProduct.merge(it.getProductId(), 1, Integer::sum);
                nameByProduct.putIfAbsent(it.getProductId(), it.getProductName());
            }
        }
        List<Map<String, Object>> productRank = revByProduct.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .limit(10)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("productId", e.getKey());
                    m.put("name", Optional.ofNullable(nameByProduct.get(e.getKey())).orElse("商品#" + e.getKey()));
                    m.put("revenue", e.getValue());
                    m.put("orders", cntByProduct.getOrDefault(e.getKey(), 0));
                    return m;
                }).collect(Collectors.toList());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("tiles", tiles);
        out.put("todos", todos);
        out.put("funnel", funnel);
        out.put("productRank", productRank);
        out.put("subtitle", "本月至今 · 已排除测试订单");
        return out;
    }

    @Transactional
    public Map<String, Object> recall(Map<String, Object> body) {
        List<Long> orderIds = toLongList(body.get("orderIds"));
        Long couponId = toLong(body.get("couponId"));
        String title = str(body, "title");
        String content = str(body, "content");
        if (!StringUtils.hasText(title)) title = "订单待支付提醒";
        if (!StringUtils.hasText(content)) content = "您有未完成的订单，打开小程序可继续付款。";

        LambdaQueryWrapper<Order> w = new LambdaQueryWrapper<Order>()
                .eq(Order::getStatus, "pending_payment")
                .and(x -> x.isNull(Order::getIsTest).or().eq(Order::getIsTest, 0));
        if (!orderIds.isEmpty()) {
            w.in(Order::getId, orderIds);
        } else {
            w.last("LIMIT 200");
        }
        List<Order> orders = orderMapper.selectList(w);
        int n = 0;
        for (Order o : orders) {
            if (o.getUserId() == null) continue;
            userNoticeService.notifyUser(o.getUserId(), "order_recall", title, content + " 订单号 " + o.getOrderNo());
            if (couponId != null) {
                try {
                    couponService.issueCoupon(o.getUserId(), couponId);
                } catch (Exception e) {
                    log.warn("召回发券失败 userId={} couponId={}", o.getUserId(), couponId, e);
                }
            }
            n++;
        }
        return Map.of("reached", n);
    }

    public void setProductTestFlag(Long id, boolean isTest) {
        Product p = productMapper.selectById(id);
        if (p == null) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "商品不存在");
        productMapper.update(null, new LambdaUpdateWrapper<Product>()
                .eq(Product::getId, id)
                .set(Product::getIsTest, isTest ? 1 : 0));
    }

    public void setOrderTestFlag(Long id, boolean isTest) {
        Order o = orderMapper.selectById(id);
        if (o == null) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "订单不存在");
        orderMapper.update(null, new LambdaUpdateWrapper<Order>()
                .eq(Order::getId, id)
                .set(Order::getIsTest, isTest ? 1 : 0));
    }

    public List<Map<String, Object>> listFlashPrices() {
        List<ProductFlashPrice> list = flashPriceMapper.selectList(new LambdaQueryWrapper<ProductFlashPrice>()
                .orderByDesc(ProductFlashPrice::getId));
        List<Map<String, Object>> out = new ArrayList<>();
        for (ProductFlashPrice f : list) {
            out.add(toFlashMap(f));
        }
        return out;
    }

    public Map<String, Object> createFlashPrice(Map<String, Object> body) {
        Long productId = toLong(body.get("productId"));
        if (productId == null) throw new BusinessException(ErrorCode.PARAM_ERROR, "productId 必填");
        BigDecimal price = toDecimal(body.get("flashPrice"));
        if (price == null) throw new BusinessException(ErrorCode.PARAM_ERROR, "flashPrice 必填");
        LocalDateTime endAt = toDateTime(body.get("endAt"));
        if (endAt == null) throw new BusinessException(ErrorCode.PARAM_ERROR, "endAt 必填");
        ProductFlashPrice f = new ProductFlashPrice();
        f.setProductId(productId);
        f.setFlashPrice(price);
        f.setStartAt(Optional.ofNullable(toDateTime(body.get("startAt"))).orElse(LocalDateTime.now()));
        f.setEndAt(endAt);
        f.setStatus(1);
        f.setCreateTime(LocalDateTime.now());
        f.setUpdateTime(LocalDateTime.now());
        flashPriceMapper.insert(f);
        return toFlashMap(f);
    }

    public Map<String, Object> updateFlashPrice(Long id, Map<String, Object> body) {
        ProductFlashPrice f = flashPriceMapper.selectById(id);
        if (f == null) throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "限时价不存在");
        if (body.containsKey("flashPrice")) f.setFlashPrice(toDecimal(body.get("flashPrice")));
        if (body.containsKey("endAt")) f.setEndAt(toDateTime(body.get("endAt")));
        if (body.containsKey("startAt")) f.setStartAt(toDateTime(body.get("startAt")));
        if (body.containsKey("status")) f.setStatus(toBoolInt(body.get("status")));
        if (body.containsKey("productId")) f.setProductId(toLong(body.get("productId")));
        f.setUpdateTime(LocalDateTime.now());
        flashPriceMapper.updateById(f);
        return toFlashMap(f);
    }

    public void deleteFlashPrice(Long id) {
        flashPriceMapper.deleteById(id);
    }

    public Map<String, Object> getSettings() {
        Map<String, Object> mall = readJsonMap(getCfg("commerce_mall_copy"), Map.of(
                "mallTitle", "暖阁小店",
                "mallIntro", "",
                "mallGuarantees", "",
                "showMallHeader", true
        ));
        Map<String, Object> sub = readJsonMap(getCfg("commerce_subscribe_flags"), Map.of(
                "subscribeOrderStatus", true,
                "subscribeShip", true,
                "subscribeCouponExpire", true,
                "subscribeRecall", true
        ));
        Map<String, Object> rules = readJsonMap(getCfg("commerce_trade_rules"), Map.of(
                "autoCloseMinutes", 30,
                "virtualRefundRule", "未学习可退",
                "invoiceEnabled", false,
                "invoiceNote", ""
        ));
        List<String> accounts = readJsonList(getCfg("commerce_test_accounts"));

        Map<String, Object> out = new LinkedHashMap<>();
        out.putAll(mall);
        out.putAll(sub);
        out.putAll(rules);
        out.put("testAccounts", accounts);
        return out;
    }

    public Map<String, Object> putSettings(Map<String, Object> body) {
        Map<String, Object> mall = new LinkedHashMap<>();
        mall.put("mallTitle", body.getOrDefault("mallTitle", "暖阁小店"));
        mall.put("mallIntro", body.getOrDefault("mallIntro", ""));
        mall.put("mallGuarantees", body.getOrDefault("mallGuarantees", ""));
        mall.put("showMallHeader", body.getOrDefault("showMallHeader", true));
        upsertCfg("commerce_mall_copy", "commerce", "商城页展示文案", writeJson(mall));

        Map<String, Object> sub = new LinkedHashMap<>();
        sub.put("subscribeOrderStatus", body.getOrDefault("subscribeOrderStatus", true));
        sub.put("subscribeShip", body.getOrDefault("subscribeShip", true));
        sub.put("subscribeCouponExpire", body.getOrDefault("subscribeCouponExpire", true));
        sub.put("subscribeRecall", body.getOrDefault("subscribeRecall", true));
        upsertCfg("commerce_subscribe_flags", "commerce", "订阅消息开关", writeJson(sub));

        Map<String, Object> rules = new LinkedHashMap<>();
        rules.put("autoCloseMinutes", body.getOrDefault("autoCloseMinutes", 30));
        rules.put("virtualRefundRule", body.getOrDefault("virtualRefundRule", ""));
        rules.put("invoiceEnabled", body.getOrDefault("invoiceEnabled", false));
        rules.put("invoiceNote", body.getOrDefault("invoiceNote", ""));
        upsertCfg("commerce_trade_rules", "commerce", "关单与退款发票", writeJson(rules));

        Object ta = body.get("testAccounts");
        List<String> accounts = new ArrayList<>();
        if (ta instanceof List<?> list) {
            for (Object o : list) {
                if (o != null && StringUtils.hasText(String.valueOf(o))) accounts.add(String.valueOf(o).trim());
            }
        } else if (ta instanceof String s) {
            for (String line : s.split("[\n,，]")) {
                if (StringUtils.hasText(line)) accounts.add(line.trim());
            }
        }
        upsertCfg("commerce_test_accounts", "commerce", "测试账号名单", writeJson(accounts));
        return getSettings();
    }

    public Map<String, Object> health() {
        List<Map<String, Object>> issues = new ArrayList<>();
        long unpaid = orderMapper.selectCount(new LambdaQueryWrapper<Order>()
                .eq(Order::getStatus, "pending_payment")
                .and(w -> w.isNull(Order::getIsTest).or().eq(Order::getIsTest, 0)));
        if (unpaid > 20) {
            issues.add(issue("unpaid", "提醒", "warn", "未付款订单较多（" + unpaid + "）", "去召回", "/commerce/orders?status=pending_payment"));
        }
        long pendingRefund = refundMapper.selectCount(new LambdaQueryWrapper<Refund>().eq(Refund::getStatus, "pending"));
        if (pendingRefund > 0) {
            issues.add(issue("refund", "退款", "warn", "有 " + pendingRefund + " 笔退款待审", "去处理", "/commerce/orders?tab=refund"));
        }
        long onSaleNoImage = productMapper.selectCount(new LambdaQueryWrapper<Product>()
                .eq(Product::getStatus, "on_sale")
                .and(w -> w.isNull(Product::getMainImage).or().eq(Product::getMainImage, "")));
        if (onSaleNoImage > 0) {
            issues.add(issue("image", "商品", "info", onSaleNoImage + " 个在售商品缺主图", "去商品", "/commerce/products"));
        }
        LocalDateTime dayAgo = LocalDateTime.now().minusDays(1);
        long paid1d = orderMapper.selectCount(new LambdaQueryWrapper<Order>()
                .in(Order::getStatus, List.of("paid", "shipped", "completed"))
                .ge(Order::getPaidAt, dayAgo)
                .and(w -> w.isNull(Order::getIsTest).or().eq(Order::getIsTest, 0)));
        if (paid1d == 0) {
            issues.add(issue("zero", "支付", "warn", "近 24 小时无付款订单（已排除测试）", "看概览", "/commerce/overview"));
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("issues", issues);
        out.put("issueCount", issues.size());
        out.put("notes", List.of(
                "订阅消息真实推送依赖微信模板配置；召回默认写站内通知。",
                "测试商品/订单不计入收入概览。"
        ));
        return out;
    }

    private Map<String, Object> toFlashMap(ProductFlashPrice f) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", f.getId());
        m.put("productId", f.getProductId());
        m.put("flashPrice", f.getFlashPrice());
        m.put("endAt", f.getEndAt() == null ? null : f.getEndAt().format(DT));
        m.put("status", f.getStatus());
        Product p = f.getProductId() == null ? null : productMapper.selectById(f.getProductId());
        if (p != null) {
            m.put("productName", p.getName());
            m.put("originalPrice", p.getPrice());
        }
        return m;
    }

    private String getCfg(String key) {
        SystemConfig c = systemConfigMapper.selectOne(new LambdaQueryWrapper<SystemConfig>()
                .eq(SystemConfig::getConfigKey, key)
                .last("LIMIT 1"));
        return c == null ? null : c.getConfigValue();
    }

    private void upsertCfg(String key, String group, String desc, String value) {
        SystemConfig c = systemConfigMapper.selectOne(new LambdaQueryWrapper<SystemConfig>()
                .eq(SystemConfig::getConfigKey, key)
                .last("LIMIT 1"));
        if (c == null) {
            c = new SystemConfig();
            c.setConfigKey(key);
            c.setConfigGroup(group);
            c.setDescription(desc);
            c.setConfigValue(value);
            c.setCreateTime(LocalDateTime.now());
            c.setUpdateTime(LocalDateTime.now());
            systemConfigMapper.insert(c);
        } else {
            c.setConfigValue(value);
            c.setUpdateTime(LocalDateTime.now());
            systemConfigMapper.updateById(c);
        }
    }

    private Map<String, Object> readJsonMap(String json, Map<String, Object> defaults) {
        Map<String, Object> out = new LinkedHashMap<>(defaults);
        if (!StringUtils.hasText(json)) return out;
        try {
            Map<String, Object> parsed = objectMapper.readValue(json, new TypeReference<>() {});
            out.putAll(parsed);
        } catch (Exception e) {
            log.warn("parse config json failed", e);
        }
        return out;
    }

    private List<String> readJsonList(String json) {
        if (!StringUtils.hasText(json)) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private String writeJson(Object o) {
        try {
            return objectMapper.writeValueAsString(o);
        } catch (Exception e) {
            return "{}";
        }
    }

    private static Map<String, Object> tile(String label, Object value, String hint) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("label", label);
        m.put("value", value);
        m.put("hint", hint);
        return m;
    }

    private static Map<String, Object> todo(String key, String title, long count, String hint, String path) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("key", key);
        m.put("title", title);
        m.put("count", count);
        m.put("hint", hint);
        m.put("path", path);
        return m;
    }

    private static Map<String, Object> issue(String key, String tag, String level, String message, String actionLabel, String actionPath) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("key", key);
        m.put("tag", tag);
        m.put("level", level);
        m.put("message", message);
        m.put("actionLabel", actionLabel);
        m.put("actionPath", actionPath);
        return m;
    }

    private static String str(Map<String, Object> body, String key) {
        if (body == null || body.get(key) == null) return null;
        String v = String.valueOf(body.get(key)).trim();
        return v.isEmpty() || "null".equals(v) ? null : v;
    }

    private static Long toLong(Object v) {
        if (v == null) return null;
        try {
            return Long.parseLong(String.valueOf(v));
        } catch (Exception e) {
            return null;
        }
    }

    private static List<Long> toLongList(Object v) {
        List<Long> out = new ArrayList<>();
        if (!(v instanceof List<?> list)) return out;
        for (Object o : list) {
            Long id = toLong(o);
            if (id != null) out.add(id);
        }
        return out;
    }

    private static BigDecimal toDecimal(Object v) {
        if (v == null) return null;
        try {
            return new BigDecimal(String.valueOf(v));
        } catch (Exception e) {
            return null;
        }
    }

    private static LocalDateTime toDateTime(Object v) {
        if (v == null) return null;
        String s = String.valueOf(v).trim().replace('T', ' ');
        if (s.length() == 16) s = s + ":00";
        try {
            return LocalDateTime.parse(s, DT);
        } catch (Exception e) {
            try {
                return LocalDateTime.parse(s);
            } catch (Exception e2) {
                return null;
            }
        }
    }

    private static int toBoolInt(Object v) {
        if (v == null) return 0;
        if (v instanceof Boolean b) return b ? 1 : 0;
        String s = String.valueOf(v);
        return "1".equals(s) || "true".equalsIgnoreCase(s) ? 1 : 0;
    }
}
