package com.miniprogram.controller;

import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.R;
import com.miniprogram.entity.ImCannedReply;
import com.miniprogram.entity.ImMessage;
import com.miniprogram.entity.Order;
import com.miniprogram.entity.OrderItem;
import com.miniprogram.entity.Product;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.OrderItemMapper;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.security.SecurityUtils;
import com.miniprogram.service.ImCardService;
import com.miniprogram.service.ImCannedReplyService;
import com.miniprogram.service.ImEventPublisher;
import com.miniprogram.service.ImService;
import com.miniprogram.service.OperatorNoticeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 客服工作台（后台）接口。
 *
 * <p>路径 {@code /api/v1/admin/ops/im/**} —— 只需登录，与运营中心其他模块同一口径。
 * 不走 {@code /admin/system/configs}（super_admin 专属，运营会 403）。
 */
@Slf4j
@Tag(name = "运营中心-客服IM工作台")
@RestController
@RequestMapping("/api/v1/admin/ops/im")
@RequiredArgsConstructor
public class AdminImController {

    private final ImService imService;
    private final ImEventPublisher imPublisher;
    private final ImCardService imCardService;
    private final ImCannedReplyService cannedReplyService;
    private final OperatorNoticeService noticeService;
    private final UserMapper userMapper;
    private final OrderMapper orderMapper;
    private final OrderItemMapper orderItemMapper;
    private final ProductMapper productMapper;

    // ==================== SSE ====================

    /**
     * 座席事件流。
     * <p>浏览器用 {@code EventSource('/api/v1/admin/ops/im/stream')} 订阅；
     * <b>不能用 fetch + ReadableStream</b>（拿不到原生 EventSource 的自动重连与 Last-Event-ID）。
     * <p>生产需 Nginx 关闭对该路径的缓冲，否则事件会被攒着一起发。
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "订阅座席事件流（SSE）")
    public SseEmitter stream(@RequestParam(required = false) Long lastEventId) {
        Long agentId = SecurityUtils.getRequiredCurrentUserId();
        String name = currentAgentName();
        imService.setPresence(agentId, name, "online");
        return imPublisher.subscribe(agentId, lastEventId);
    }

    // ==================== 会话 ====================

    @GetMapping("/conversations")
    @Operation(summary = "会话列表")
    public R<List<Map<String, Object>>> conversations(
            @RequestParam(required = false) String tab,
            @RequestParam(required = false) String keyword) {
        return R.ok(imService.listConversations(tab, keyword));
    }

    @GetMapping("/conversations/{id}")
    @Operation(summary = "会话详情（含消息）")
    public R<Map<String, Object>> conversation(@PathVariable Long id) {
        return R.ok(imService.conversationDetail(id));
    }

    @GetMapping("/conversations/{id}/messages")
    @Operation(summary = "按 seq 游标拉取消息（断线续传）")
    public R<List<Map<String, Object>>> messages(@PathVariable Long id,
                                                 @RequestParam(required = false) Integer afterSeq,
                                                 @RequestParam(required = false) Integer limit) {
        imService.markReadByAgent(id);
        return R.ok(imService.listMessages(id, afterSeq, limit));
    }

    @PostMapping("/conversations/{id}/accept")
    @Operation(summary = "接入会话")
    public R<Void> accept(@PathVariable Long id) {
        Long agentId = SecurityUtils.getRequiredCurrentUserId();
        imService.accept(id, agentId, currentAgentName());
        return R.ok(null);
    }

    @PostMapping("/conversations/{id}/close")
    @Operation(summary = "结束会话")
    public R<Void> close(@PathVariable Long id) {
        imService.close(id);
        return R.ok(null);
    }

    @PostMapping("/conversations/{id}/transfer")
    @Operation(summary = "转接会话")
    public R<Void> transfer(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long newAgentId = body.get("agentId") == null ? null : Long.valueOf(String.valueOf(body.get("agentId")));
        imService.transfer(id, newAgentId, body.get("agentName") == null ? null : String.valueOf(body.get("agentName")));
        return R.ok(null);
    }

    @PostMapping("/conversations/{id}/pin")
    @Operation(summary = "置顶 / 取消置顶")
    public R<Void> pin(@PathVariable Long id, @RequestParam boolean pinned) {
        imService.pin(id, pinned);
        return R.ok(null);
    }

    // ==================== 发消息 ====================

    @PostMapping("/conversations/{id}/messages")
    @Operation(summary = "客服发消息（text / image / product_card / logistics_card）")
    public R<Map<String, Object>> send(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long agentId = SecurityUtils.getRequiredCurrentUserId();
        String name = currentAgentName();
        String type = str(body.get("msgType"), ImMessage.TYPE_TEXT);
        String text = str(body.get("text"), "");

        Map<String, Object> payload = null;
        if (ImMessage.TYPE_PRODUCT_CARD.equals(type)) {
            Long productId = body.get("productId") == null ? null : Long.valueOf(String.valueOf(body.get("productId")));
            if (productId == null) {
                throw new BusinessException(ErrorCode.PARAM_ERROR, "商品卡需指定 productId");
            }
            payload = imCardService.productCard(productId);
            text = str(payload.get("title"), "");
        } else if (ImMessage.TYPE_LOGISTICS_CARD.equals(type)) {
            Long orderId = body.get("orderId") == null ? null : Long.valueOf(String.valueOf(body.get("orderId")));
            if (orderId == null) {
                throw new BusinessException(ErrorCode.PARAM_ERROR, "物流卡需指定 orderId");
            }
            Order order = orderMapper.selectById(orderId);
            if (order == null) {
                throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "订单不存在");
            }
            payload = imCardService.logisticsCard(order);
            text = "订单 " + str(payload.get("orderNo"), "") + " 已发货";
        } else if (ImMessage.TYPE_IMAGE.equals(type)) {
            String url = str(body.get("imageUrl"), "");
            if (!StringUtils.hasText(url)) {
                throw new BusinessException(ErrorCode.PARAM_ERROR, "图片消息需指定 imageUrl");
            }
            payload = new LinkedHashMap<>();
            payload.put("url", url);
        } else if (!ImMessage.TYPE_TEXT.equals(type)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "不支持的消息类型：" + type);
        }

        ImMessage msg = imService.send(id, "agent", agentId, name, type, payload, text);
        // 客服回复也提示买家（离线时靠订阅消息/站内信）
        imService.markReadByAgent(id);
        return R.ok(imService.toMessageMap(msg));
    }

    @PostMapping("/conversations/{id}/typing")
    @Operation(summary = "输入中状态")
    public R<Void> typing(@PathVariable Long id, @RequestParam boolean typing) {
        imService.setTyping(id, typing);
        return R.ok(null);
    }

    // ==================== 右侧面板数据 ====================

    @GetMapping("/conversations/{id}/customer")
    @Operation(summary = "客户档案 + 足迹")
    public R<Map<String, Object>> customer(@PathVariable Long id) {
        Map<String, Object> conv = imService.toConversationMap(imService.requireConversation(id));
        Long userId = conv.get("userId") == null ? null : Long.valueOf(String.valueOf(conv.get("userId")));
        Map<String, Object> out = new LinkedHashMap<>(conv);
        out.putAll(imCardService.customerProfile(userId));
        if (userId != null) {
            User u = userMapper.selectById(userId);
            if (u != null) {
                out.put("memberExpireAt", u.getMemberExpireAt());
                out.put("registerDays", u.getCreateTime() == null ? null
                        : java.time.Duration.between(u.getCreateTime(), java.time.LocalDateTime.now()).toDays());
            }
        }
        return R.ok(out);
    }

    @GetMapping("/conversations/{id}/orders")
    @Operation(summary = "客户近期订单（右栏关联订单）")
    public R<List<Map<String, Object>>> orders(@PathVariable Long id,
                                               @RequestParam(defaultValue = "10") int limit) {
        Map<String, Object> conv = imService.toConversationMap(imService.requireConversation(id));
        Long userId = conv.get("userId") == null ? null : Long.valueOf(String.valueOf(conv.get("userId")));
        return R.ok(imCardService.userOrders(userId, limit));
    }

    // ==================== 商品库 / 订单库 ====================

    @GetMapping("/products")
    @Operation(summary = "商品库搜索（发商品卡用）")
    public R<List<Map<String, Object>>> products(@RequestParam(required = false) String keyword,
                                                 @RequestParam(defaultValue = "20") int limit) {
        com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Product> w =
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Product>()
                        .orderByDesc(Product::getSortOrder)
                        .orderByDesc(Product::getId);
        if (StringUtils.hasText(keyword)) {
            w.like(Product::getName, keyword.trim());
        }
        w.last("LIMIT " + Math.min(Math.max(limit, 1), 50));
        List<Map<String, Object>> out = new java.util.ArrayList<>();
        for (Product p : productMapper.selectList(w)) {
            Map<String, Object> m = imCardService.productCard(p.getId());
            m.put("sales", p.getSales());
            out.add(m);
        }
        return R.ok(out);
    }

    @GetMapping("/conversations/{id}/shippable-orders")
    @Operation(summary = "可推送物流的订单（待发货 / 已发货）")
    public R<List<Map<String, Object>>> shippableOrders(@PathVariable Long id) {
        Map<String, Object> conv = imService.toConversationMap(imService.requireConversation(id));
        Long userId = conv.get("userId") == null ? null : Long.valueOf(String.valueOf(conv.get("userId")));
        if (userId == null) {
            return R.ok(List.of());
        }
        List<Order> orders = orderMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Order>()
                        .eq(Order::getUserId, userId)
                        .in(Order::getStatus, "paid", "shipped")
                        .orderByDesc(Order::getCreatedAt)
                        .last("LIMIT 20"));
        List<Map<String, Object>> out = new java.util.ArrayList<>();
        for (Order o : orders) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("orderId", o.getId());
            m.put("orderNo", o.getOrderNo());
            m.put("status", o.getStatus());
            m.put("logisticsCompany", o.getLogisticsCompany());
            m.put("logisticsNo", o.getLogisticsNo());
            m.put("canPush", "shipped".equals(o.getStatus()));
            List<String> names = new java.util.ArrayList<>();
            for (OrderItem it : orderItemMapper.selectList(
                    new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<OrderItem>()
                            .eq(OrderItem::getOrderId, o.getId()).last("LIMIT 3"))) {
                if (StringUtils.hasText(it.getProductName())) {
                    names.add(it.getProductName());
                }
            }
            m.put("productNames", names);
            out.add(m);
        }
        return R.ok(out);
    }

    // ==================== 快捷话术 ====================

    @GetMapping("/canned-replies")
    @Operation(summary = "话术库列表")
    public R<List<Map<String, Object>>> cannedReplies(@RequestParam(required = false) String group,
                                                      @RequestParam(required = false) String keyword) {
        return R.ok(cannedReplyService.list(group, keyword));
    }

    @PostMapping("/canned-replies")
    @Operation(summary = "新增话术")
    public R<ImCannedReply> createCannedReply(@RequestBody Map<String, Object> body) {
        return R.ok(cannedReplyService.create(body));
    }

    @PutMapping("/canned-replies/{id}")
    @Operation(summary = "修改话术")
    public R<Void> updateCannedReply(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        cannedReplyService.update(id, body);
        return R.ok(null);
    }

    @DeleteMapping("/canned-replies/{id}")
    @Operation(summary = "删除话术（内置话术转为停用）")
    public R<Void> deleteCannedReply(@PathVariable Long id) {
        cannedReplyService.delete(id);
        return R.ok(null);
    }

    // ==================== 座席与通知 ====================

    @GetMapping("/agents")
    @Operation(summary = "座席在线状态")
    public R<List<Map<String, Object>>> agents() {
        return R.ok(imService.listAgents());
    }

    @PostMapping("/presence")
    @Operation(summary = "切换自己的状态：online / busy / offline")
    public R<Void> presence(@RequestParam String state) {
        imService.setPresence(SecurityUtils.getRequiredCurrentUserId(), currentAgentName(), state);
        return R.ok(null);
    }

    @GetMapping("/notice-settings")
    @Operation(summary = "运营通知三通道配置")
    public R<List<Map<String, Object>>> noticeSettings() {
        return R.ok(noticeService.listSettings());
    }

    @PutMapping("/notice-settings/{channel}")
    @Operation(summary = "保存某个通知通道")
    public R<Void> updateNoticeSetting(@PathVariable String channel,
                                       @RequestBody Map<String, Object> body) {
        List<String> receivers = new java.util.ArrayList<>();
        Object raw = body.get("receivers");
        if (raw instanceof List<?> list) {
            for (Object o : list) {
                if (o != null && StringUtils.hasText(String.valueOf(o))) {
                    receivers.add(String.valueOf(o));
                }
            }
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> cfg = body.get("config") instanceof Map
                ? (Map<String, Object>) body.get("config") : new LinkedHashMap<>();
        noticeService.updateSetting(channel, Boolean.TRUE.equals(body.get("enabled")), cfg, receivers);
        return R.ok(null);
    }

    @PostMapping("/notice-settings/test-wecom")
    @Operation(summary = "企微机器人连通性自检")
    public R<Map<String, Object>> testWecom(@RequestBody Map<String, Object> body) {
        String webhook = body.get("webhook") == null ? null : String.valueOf(body.get("webhook"));
        String title = body.get("title") == null ? null : String.valueOf(body.get("title"));
        String content = body.get("content") == null ? null : String.valueOf(body.get("content"));
        String err = noticeService.testWecomBot(webhook, title, content);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("ok", err == null);
        out.put("message", err == null ? "发送成功，请到企微群确认" : err);
        return R.ok(out);
    }

    // ==================== 工具 ====================

    private String currentAgentName() {
        try {
            var auth = SecurityUtils.getAuthentication();
            if (auth != null && auth.getName() != null) {
                return String.valueOf(auth.getName());
            }
        } catch (Exception ignored) {
            // 未认证时用 id 兜底
        }
        return "客服" + SecurityUtils.getRequiredCurrentUserId();
    }

    private String str(Object v, String fallback) {
        if (v == null) {
            return fallback;
        }
        String s = String.valueOf(v);
        return StringUtils.hasText(s) ? s : fallback;
    }
}
