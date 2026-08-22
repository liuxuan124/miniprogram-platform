package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.*;
import com.miniprogram.entity.AiConversation;
import com.miniprogram.entity.Content;
import com.miniprogram.entity.Order;
import com.miniprogram.entity.Product;
import com.miniprogram.mapper.AiConversationMapper;
import com.miniprogram.mapper.ContentMapper;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.service.AiClientService;
import com.miniprogram.service.AiConversationService;
import com.miniprogram.service.AiRecommendationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * AI对话 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiConversationServiceImpl implements AiConversationService {

    private final AiConversationMapper conversationMapper;
    private final AiClientService aiClientService;
    private final AiRecommendationService recommendationService;
    private final ProductMapper productMapper;
    private final ContentMapper contentMapper;
    private final OrderMapper orderMapper;

    private static final DateTimeFormatter DTF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AiChatVO chat(Long userId, AiChatDTO chatDTO) {
        // 生成或使用已有sessionId
        String sessionId = chatDTO.getSessionId();
        if (!StringUtils.hasText(sessionId)) {
            sessionId = "sess_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        }

        // 获取会话历史（用于AI上下文）
        List<AiConversation> history = getSessionHistory(sessionId);

        // F11：能办事客服 — 白名单意图优先（查单安全执行；退款/预约仅返回确认步骤）
        ActionResult actionResult = resolveWhitelistedAction(userId, chatDTO.getQuestion());

        AiClientService.AiResponse aiResponse;
        List<AiConversation.RecommendedItem> recommendedItems;
        if (actionResult != null && StringUtils.hasText(actionResult.answer)) {
            aiResponse = new AiClientService.AiResponse();
            aiResponse.setAnswer(actionResult.answer);
            aiResponse.setTransferHuman(false);
            recommendedItems = Collections.emptyList();
        } else {
            aiResponse = aiClientService.chat(chatDTO.getQuestion(), sessionId, history);
            recommendedItems = buildRecommendedItems(chatDTO.getQuestion());
        }

        // 保存对话记录
        AiConversation conversation = new AiConversation();
        conversation.setUserId(userId);
        conversation.setSessionId(sessionId);
        conversation.setQuestion(chatDTO.getQuestion());
        conversation.setAnswer(aiResponse.getAnswer());
        conversation.setRecommendedItems(recommendedItems);
        conversation.setIsTransferHuman(aiResponse.isTransferHuman());
        conversation.setCreatedAt(LocalDateTime.now());
        conversation.setUpdatedAt(LocalDateTime.now());
        conversation.setDeleted(0);
        conversationMapper.insert(conversation);

        // 批量保存推荐日志
        if (recommendedItems != null && !recommendedItems.isEmpty()) {
            recommendationService.batchSaveRecommendationLogs(conversation.getId(), userId, recommendedItems);
        }

        // 构建响应（严格遵循AI推荐契约格式）
        AiChatVO vo = new AiChatVO();
        vo.setAnswer(aiResponse.getAnswer());
        vo.setRecommendedItems(recommendedItems);
        vo.setIsTransferHuman(aiResponse.isTransferHuman());
        vo.setSessionId(sessionId);
        if (actionResult != null) {
            vo.setAction(actionResult.action);
        }

        return vo;
    }

    private static final class ActionResult {
        final String answer;
        final Map<String, Object> action;

        ActionResult(String answer, Map<String, Object> action) {
            this.answer = answer;
            this.action = action;
        }
    }

    /**
     * 白名单意图：query_order（查最近 3 单）、apply_refund_hint / book_appointment_hint（仅引导，不自动执行）
     */
    private ActionResult resolveWhitelistedAction(Long userId, String question) {
        if (!StringUtils.hasText(question)) return null;
        String q = question.trim().toLowerCase(Locale.ROOT);
        String raw = question.trim();

        boolean wantOrder = containsAny(raw, "订单", "物流", "发货", "到哪了", "状态")
                || containsAny(q, "order", "shipping");
        boolean wantRefund = containsAny(raw, "退款", "退货", "售后", "取消订单")
                || containsAny(q, "refund");
        boolean wantAppt = containsAny(raw, "预约", "约时间", "改期", "咨询时间")
                || containsAny(q, "appointment", "booking");

        if (wantRefund) {
            Map<String, Object> action = new LinkedHashMap<>();
            action.put("type", "apply_refund_hint");
            action.put("confirmRequired", true);
            action.put("steps", List.of(
                    "打开「我的 → 全部订单」找到目标订单",
                    "进入订单详情，确认是否在售后时效内",
                    "点击申请退款并填写原因（不会自动提交）",
                    "如需协助，可转人工客服并提供订单号"
            ));
            action.put("path", "/pkg-trade/order-list/order-list");
            String answer = "退款涉及资金，我不会自动替你提交。请按以下步骤确认后自行操作：\n"
                    + "1. 打开「我的 → 全部订单」\n"
                    + "2. 进入订单详情核对金额与状态\n"
                    + "3. 点击申请退款并填写原因\n"
                    + "需要人工协助时，请提供订单号。";
            return new ActionResult(answer, action);
        }

        if (wantAppt) {
            Map<String, Object> action = new LinkedHashMap<>();
            action.put("type", "book_appointment_hint");
            action.put("confirmRequired", true);
            action.put("steps", List.of(
                    "进入预约服务页选择时段",
                    "确认联系人与备注信息",
                    "提交前核对时间（系统不会自动帮你下单预约）"
            ));
            action.put("path", "/pkg-user/my-appointments/my-appointments");
            String answer = "预约需要你确认时段后提交，我不会自动下单。可到「我的预约」查看已有预约，或从商品/服务页选择时段完成预约。";
            return new ActionResult(answer, action);
        }

        if (wantOrder && userId != null) {
            List<Order> orders = orderMapper.selectList(new LambdaQueryWrapper<Order>()
                    .eq(Order::getUserId, userId)
                    .orderByDesc(Order::getCreatedAt)
                    .last("LIMIT 3"));
            List<Map<String, Object>> rows = new ArrayList<>();
            StringBuilder sb = new StringBuilder();
            if (orders.isEmpty()) {
                sb.append("暂未查到你的订单。可到「我的 → 全部订单」确认是否已登录同一账号。");
            } else {
                sb.append("为你查到最近 ").append(orders.size()).append(" 笔订单：\n");
                for (Order o : orders) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("orderId", o.getId());
                    row.put("orderNo", o.getOrderNo());
                    row.put("status", o.getStatus());
                    row.put("payAmount", o.getPayAmount());
                    rows.add(row);
                    sb.append("· ").append(o.getOrderNo())
                            .append("｜").append(statusLabel(o.getStatus()))
                            .append("｜¥").append(o.getPayAmount() == null ? "0" : o.getPayAmount())
                            .append("\n");
                }
                sb.append("如需退款请明确说「申请退款」，我会给出操作指引（不会自动退款）。");
            }
            Map<String, Object> action = new LinkedHashMap<>();
            action.put("type", "query_order");
            action.put("confirmRequired", false);
            action.put("orders", rows);
            action.put("path", "/pkg-trade/order-list/order-list");
            return new ActionResult(sb.toString().trim(), action);
        }

        return null;
    }

    private static boolean containsAny(String text, String... keys) {
        if (text == null) return false;
        for (String k : keys) {
            if (text.contains(k)) return true;
        }
        return false;
    }

    private static String statusLabel(String status) {
        if (status == null) return "未知";
        return switch (status) {
            case "pending_payment" -> "待支付";
            case "paid" -> "已支付";
            case "shipped" -> "已发货";
            case "completed" -> "已完成";
            case "closed" -> "已关闭";
            case "refunding" -> "退款中";
            case "refunded" -> "已退款";
            default -> status;
        };
    }

    @Override
    public PageResult<AiChatVO> getHistory(Long userId, String sessionId, Long current, Long size) {
        LambdaQueryWrapper<AiConversation> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiConversation::getUserId, userId);
        wrapper.eq(StringUtils.hasText(sessionId), AiConversation::getSessionId, sessionId);
        wrapper.orderByDesc(AiConversation::getCreatedAt);

        Page<AiConversation> page = conversationMapper.selectPage(
                new Page<>(current, size), wrapper
        );

        PageResult<AiChatVO> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setCurrent(page.getCurrent());
        result.setSize(page.getSize());
        result.setRecords(page.getRecords().stream().map(this::toChatVO).collect(Collectors.toList()));
        return result;
    }

    @Override
    public PageResult<AiConversationVO> listConversations(AiConversationQueryDTO queryDTO) {
        LambdaQueryWrapper<AiConversation> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(queryDTO.getUserId() != null, AiConversation::getUserId, queryDTO.getUserId());
        wrapper.eq(StringUtils.hasText(queryDTO.getSessionId()), AiConversation::getSessionId, queryDTO.getSessionId());
        wrapper.eq(queryDTO.getIsTransferHuman() != null, AiConversation::getIsTransferHuman, queryDTO.getIsTransferHuman());

        if (StringUtils.hasText(queryDTO.getStartTime())) {
            wrapper.ge(AiConversation::getCreatedAt, LocalDateTime.parse(queryDTO.getStartTime(), DTF));
        }
        if (StringUtils.hasText(queryDTO.getEndTime())) {
            wrapper.le(AiConversation::getCreatedAt, LocalDateTime.parse(queryDTO.getEndTime(), DTF));
        }

        wrapper.orderByDesc(AiConversation::getCreatedAt);

        Page<AiConversation> page = conversationMapper.selectPage(
                new Page<>(queryDTO.getCurrent(), queryDTO.getSize()), wrapper
        );

        PageResult<AiConversationVO> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setCurrent(page.getCurrent());
        result.setSize(page.getSize());
        result.setRecords(page.getRecords().stream().map(this::toConversationVO).collect(Collectors.toList()));
        return result;
    }

    @Override
    public AiConversationVO getConversationDetail(Long id) {
        AiConversation conversation = conversationMapper.selectById(id);
        if (conversation == null) {
            throw new BusinessException(1000401, "对话不存在");
        }
        return toConversationVO(conversation);
    }

    @Override
    public List<AiConversation> getSessionHistory(String sessionId) {
        LambdaQueryWrapper<AiConversation> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiConversation::getSessionId, sessionId);
        wrapper.orderByAsc(AiConversation::getCreatedAt);
        wrapper.last("LIMIT 20");
        return conversationMapper.selectList(wrapper);
    }

    // ==================== 私有方法 ====================

    /**
     * 根据用户问题查询真实商品/内容数据，构建推荐项
     */
    private List<AiConversation.RecommendedItem> buildRecommendedItems(String question) {
        List<AiConversation.RecommendedItem> items = new ArrayList<>();

        // 查询热门商品（最多3个）
        List<Product> products = queryProducts(question);
        for (int i = 0; i < Math.min(products.size(), 3); i++) {
            Product p = products.get(i);
            AiConversation.RecommendedItem item = new AiConversation.RecommendedItem();
            item.setType("product");
            item.setId(String.valueOf(p.getId()));
            item.setTitle(p.getName());
            item.setImage(p.getMainImage());
            item.setReason("热门商品推荐");
            items.add(item);
        }

        // 查询热门内容（最多2个）
        List<Content> contents = queryContents(question);
        for (int i = 0; i < Math.min(contents.size(), 2); i++) {
            Content c = contents.get(i);
            AiConversation.RecommendedItem item = new AiConversation.RecommendedItem();
            item.setType("content");
            item.setId(String.valueOf(c.getId()));
            item.setTitle(c.getTitle());
            item.setImage(c.getCoverImage());
            item.setReason("热门内容推荐");
            items.add(item);
        }

        return items;
    }

    /**
     * 查询商品 — 根据关键词匹配或返回热门商品
     */
    private List<Product> queryProducts(String question) {
        LambdaQueryWrapper<Product> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Product::getStatus, "on_sale");

        // 尝试关键词匹配
        if (StringUtils.hasText(question)) {
            wrapper.and(w -> w.like(Product::getName, question)
                    .or().like(Product::getDescription, question));
        }

        wrapper.orderByDesc(Product::getSales);
        wrapper.last("LIMIT 3");

        List<Product> products = productMapper.selectList(wrapper);

        // 如果关键词匹配无结果，返回销量最高的商品
        if (products.isEmpty()) {
            LambdaQueryWrapper<Product> fallbackWrapper = new LambdaQueryWrapper<>();
            fallbackWrapper.eq(Product::getStatus, "on_sale");
            fallbackWrapper.orderByDesc(Product::getSales);
            fallbackWrapper.last("LIMIT 3");
            products = productMapper.selectList(fallbackWrapper);
        }

        return products;
    }

    /**
     * 查询内容 — 根据关键词匹配或返回热门内容
     */
    private List<Content> queryContents(String question) {
        LambdaQueryWrapper<Content> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Content::getStatus, "published");

        // 尝试关键词匹配
        if (StringUtils.hasText(question)) {
            wrapper.and(w -> w.like(Content::getTitle, question)
                    .or().like(Content::getSummary, question));
        }

        wrapper.orderByDesc(Content::getViewCount);
        wrapper.last("LIMIT 2");

        List<Content> contents = contentMapper.selectList(wrapper);

        // 如果关键词匹配无结果，返回浏览量最高的内容
        if (contents.isEmpty()) {
            LambdaQueryWrapper<Content> fallbackWrapper = new LambdaQueryWrapper<>();
            fallbackWrapper.eq(Content::getStatus, "published");
            fallbackWrapper.orderByDesc(Content::getViewCount);
            fallbackWrapper.last("LIMIT 2");
            contents = contentMapper.selectList(fallbackWrapper);
        }

        return contents;
    }

    /**
     * 实体转ChatVO
     */
    private AiChatVO toChatVO(AiConversation conversation) {
        AiChatVO vo = new AiChatVO();
        vo.setAnswer(conversation.getAnswer());
        vo.setRecommendedItems(conversation.getRecommendedItems());
        vo.setIsTransferHuman(conversation.getIsTransferHuman());
        vo.setSessionId(conversation.getSessionId());
        return vo;
    }

    /**
     * 实体转ConversationVO
     */
    private AiConversationVO toConversationVO(AiConversation conversation) {
        AiConversationVO vo = new AiConversationVO();
        vo.setId(conversation.getId());
        vo.setUserId(conversation.getUserId());
        vo.setSessionId(conversation.getSessionId());
        vo.setQuestion(conversation.getQuestion());
        vo.setAnswer(conversation.getAnswer());
        vo.setRecommendedItems(conversation.getRecommendedItems());
        vo.setIsTransferHuman(conversation.getIsTransferHuman());
        vo.setCreatedAt(conversation.getCreatedAt());
        return vo;
    }
}
