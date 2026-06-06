package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.*;
import com.miniprogram.entity.AiConversation;
import com.miniprogram.entity.Content;
import com.miniprogram.entity.Product;
import com.miniprogram.mapper.AiConversationMapper;
import com.miniprogram.mapper.ContentMapper;
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

        // 调用AI服务
        AiClientService.AiResponse aiResponse = aiClientService.chat(chatDTO.getQuestion(), sessionId, history);

        // 根据用户问题查询真实商品/内容数据，填充推荐项
        List<AiConversation.RecommendedItem> recommendedItems = buildRecommendedItems(chatDTO.getQuestion());

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

        return vo;
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
