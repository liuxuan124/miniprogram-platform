package com.miniprogram.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.entity.ImMessage;
import com.miniprogram.entity.Order;
import com.miniprogram.entity.OrderItem;
import com.miniprogram.entity.Product;
import com.miniprogram.mapper.OrderItemMapper;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.mapper.ProductMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * IM 富媒体卡片组装。
 *
 * <p><b>为什么单独一层</b>：卡片结构在「后台工作台」与「小程序买家端」都要渲染，
 * 若各自拼 JSON 必然出现「客服看到有商品标题、买家看到是 undefined」。
 * 这里产出唯一结构的 Map，两端只负责渲染。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImCardService {

    private final ProductMapper productMapper;
    private final OrderMapper orderMapper;
    private final OrderItemMapper orderItemMapper;
    private final LogisticsTrackService logisticsTrackService;

    /**
     * 商品卡 payload。
     * <p>字段名与需求约定一致：id / title / cover_url / price / original_price / stock / link_path。
     */
    public Map<String, Object> productCard(Long productId) {
        Product p = productMapper.selectById(productId);
        Map<String, Object> card = new LinkedHashMap<>();
        if (p == null) {
            card.put("id", productId);
            card.put("title", "商品已下架");
            card.put("coverUrl", "");
            card.put("price", "0");
            card.put("originalPrice", "");
            card.put("stock", 0);
            card.put("linkPath", "");
            card.put("available", false);
            return card;
        }
        card.put("id", p.getId());
        card.put("title", p.getName());
        card.put("coverUrl", p.getMainImage());
        card.put("price", money(p.getPrice()));
        card.put("originalPrice", money(p.getOriginalPrice()));
        card.put("stock", p.getStock() == null ? 0 : p.getStock());
        card.put("sales", p.getSales() == null ? 0 : p.getSales());
        card.put("productType", p.getProductType());
        card.put("available", p.getStatus() != null && "on".equalsIgnoreCase(p.getStatus()));
        // 端上跳转必须用分包路径；主包未注册页会跳空白
        card.put("linkPath", "/pkg-content/product-detail/product-detail?id=" + p.getId());
        return card;
    }

    /**
     * 物流卡 payload。
     * <p>轨迹来自 {@link LogisticsTrackService}（带缓存与降级），查不到时只给「已发货」一条，
     * 绝不让卡片空白 —— 买家最需要知道的是「已发货 + 单号」。
     */
    public Map<String, Object> logisticsCard(Order order) {
        Map<String, Object> card = new LinkedHashMap<>();
        card.put("orderId", order.getId());
        card.put("orderNo", order.getOrderNo());

        boolean virtual = "virtual".equalsIgnoreCase(order.getFulfillmentType());
        card.put("virtual", virtual);
        if (virtual) {
            card.put("expressName", "虚拟商品");
            card.put("trackingNo", "");
            card.put("status", "已发货");
            card.put("latestTrack", "已自动发货，点开查看内容");
            card.put("updateTime", fmt(order.getShippedAt()));
            card.put("tracks", new ArrayList<Map<String, String>>());
            card.put("linkPath", "/pkg-trade/order-detail/order-detail?id=" + order.getId());
            return card;
        }

        String company = order.getLogisticsCompany();
        String trackingNo = order.getLogisticsNo();
        card.put("expressName", StringUtils.hasText(company) ? company : "快递");
        card.put("trackingNo", StringUtils.hasText(trackingNo) ? trackingNo : "");
        card.put("status", "已发货");
        card.put("updateTime", fmt(order.getShippedAt()));
        card.put("linkPath", "/pkg-trade/order-detail/order-detail?id=" + order.getId());

        List<Map<String, String>> tracks = new ArrayList<>();
        if (StringUtils.hasText(trackingNo)) {
            try {
                tracks = logisticsTrackService.query(company, trackingNo);
            } catch (Exception e) {
                log.warn("物流轨迹查询失败，降级为单条 orderNo={}: {}", trackingNo, e.getMessage());
            }
        }
        if (tracks.isEmpty()) {
            Map<String, String> fallback = new LinkedHashMap<>();
            fallback.put("time", fmt(order.getShippedAt()));
            fallback.put("context", "包裹已发出，"
                    + (StringUtils.hasText(company) ? company : "快递")
                    + (StringUtils.hasText(trackingNo) ? " " + trackingNo : "")
                    + "，可在订单详情查看实时轨迹");
            tracks.add(fallback);
        }
        card.put("tracks", tracks);
        card.put("latestTrack", tracks.get(0).get("context"));
        card.put("trackCount", tracks.size());
        return card;
    }

    /** 系统事件胶囊（如「订单已支付成功」「系统已自动推送发货单据」）。 */
    public Map<String, Object> systemEvent(String title, String desc) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("title", title);
        m.put("desc", desc);
        return m;
    }

    /** 客户画像：注册时长 / 累计消费 / 客单价。 */
    public Map<String, Object> customerProfile(Long userId) {
        Map<String, Object> m = new LinkedHashMap<>();
        if (userId == null) {
            return m;
        }
        List<Order> orders = orderMapper.selectList(new LambdaQueryWrapper<Order>()
                .eq(Order::getUserId, userId)
                .in(Order::getStatus, "paid", "shipped", "completed"));
        BigDecimal total = BigDecimal.ZERO;
        int count = 0;
        LocalDateTime lastOrderAt = null;
        for (Order o : orders) {
            if (o.getPayAmount() != null) {
                total = total.add(o.getPayAmount());
                count++;
            }
            if (o.getCreatedAt() != null && (lastOrderAt == null || o.getCreatedAt().isAfter(lastOrderAt))) {
                lastOrderAt = o.getCreatedAt();
            }
        }
        m.put("orderCount", count);
        m.put("totalPaid", money(total));
        m.put("avgPaid", count == 0 ? "0" : money(total.divide(BigDecimal.valueOf(count), 2, java.math.RoundingMode.HALF_UP)));
        m.put("lastOrderAt", lastOrderAt);
        m.put("memberExpireAt", null);
        return m;
    }

    /** 客户近期订单（右栏「关联订单」）。 */
    public List<Map<String, Object>> userOrders(Long userId, int limit) {
        if (userId == null) {
            return List.of();
        }
        List<Order> orders = orderMapper.selectList(new LambdaQueryWrapper<Order>()
                .eq(Order::getUserId, userId)
                .orderByDesc(Order::getCreatedAt)
                .last("LIMIT " + (limit <= 0 ? 10 : Math.min(limit, 50))));
        List<Map<String, Object>> out = new ArrayList<>();
        for (Order o : orders) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", o.getId());
            m.put("orderNo", o.getOrderNo());
            m.put("status", o.getStatus());
            m.put("statusLabel", orderStatusLabel(o.getStatus()));
            m.put("payAmount", money(o.getPayAmount()));
            m.put("fulfillmentType", o.getFulfillmentType());
            m.put("logisticsCompany", o.getLogisticsCompany());
            m.put("logisticsNo", o.getLogisticsNo());
            m.put("shippedAt", o.getShippedAt());
            m.put("createTime", o.getCreatedAt());
            m.put("productNames", orderProductNames(o.getId()));
            out.add(m);
        }
        return out;
    }

    private List<String> orderProductNames(Long orderId) {
        List<OrderItem> items = orderItemMapper.selectList(new LambdaQueryWrapper<OrderItem>()
                .eq(OrderItem::getOrderId, orderId).last("LIMIT 3"));
        List<String> names = new ArrayList<>();
        for (OrderItem it : items) {
            if (StringUtils.hasText(it.getProductName())) {
                names.add(it.getProductName());
            }
        }
        return names;
    }

    private String orderStatusLabel(String status) {
        if ("pending_payment".equals(status)) return "待付款";
        if ("paid".equals(status)) return "待发货";
        if ("shipped".equals(status)) return "已发货";
        if ("completed".equals(status)) return "已完成";
        if ("closed".equals(status)) return "已关闭";
        if ("refunding".equals(status)) return "退款中";
        if ("refunded".equals(status)) return "已退款";
        return status;
    }

    private String money(BigDecimal v) {
        return v == null ? "0" : v.stripTrailingZeros().toPlainString();
    }

    private String fmt(LocalDateTime t) {
        return t == null ? "" : t.toString().replace("T", " ").substring(0, 16);
    }
}
