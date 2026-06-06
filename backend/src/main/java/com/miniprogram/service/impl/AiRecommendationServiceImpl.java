package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.AiRecommendationLogDTO;
import com.miniprogram.dto.AiRecommendationLogQueryDTO;
import com.miniprogram.dto.AiStatsVO;
import com.miniprogram.entity.AiConversation;
import com.miniprogram.entity.AiRecommendationLog;
import com.miniprogram.entity.Content;
import com.miniprogram.entity.Product;
import com.miniprogram.mapper.AiConversationMapper;
import com.miniprogram.mapper.AiRecommendationLogMapper;
import com.miniprogram.mapper.ContentMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.service.AiRecommendationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 推荐日志 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiRecommendationServiceImpl implements AiRecommendationService {

    private final AiRecommendationLogMapper recommendationLogMapper;
    private final AiConversationMapper conversationMapper;
    private final ProductMapper productMapper;
    private final ContentMapper contentMapper;

    private static final DateTimeFormatter DTF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    public Object recommend(String userOpenId, String category, int limit) {
        int safeLimit = Math.max(1, Math.min(limit <= 0 ? 5 : limit, 20));
        String safeCategory = StringUtils.hasText(category) ? category : "mixed";

        List<Map<String, Object>> items = new java.util.ArrayList<>();
        if ("product".equalsIgnoreCase(safeCategory) || "mixed".equalsIgnoreCase(safeCategory)) {
            items.addAll(recommendProducts(safeLimit));
        }
        if ("content".equalsIgnoreCase(safeCategory) || "article".equalsIgnoreCase(safeCategory) || "mixed".equalsIgnoreCase(safeCategory)) {
            items.addAll(recommendContents(safeLimit));
        }

        Map<String, Object> result = new HashMap<>();
        result.put("userOpenId", userOpenId);
        result.put("category", safeCategory);
        result.put("items", items.stream().limit(safeLimit).toList());
        return result;
    }

    @Override
    public void recordClick(Long userId, AiRecommendationLogDTO logDTO) {
        // 验证对话存在
        AiConversation conversation = conversationMapper.selectById(logDTO.getConversationId());
        if (conversation == null) {
            throw new BusinessException(1000401, "对话不存在");
        }

        // 查找对应的推荐日志并标记为已点击
        LambdaUpdateWrapper<AiRecommendationLog> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.eq(AiRecommendationLog::getConversationId, logDTO.getConversationId())
                .eq(AiRecommendationLog::getItemType, logDTO.getItemType())
                .eq(AiRecommendationLog::getItemId, logDTO.getItemId())
                .set(AiRecommendationLog::getIsClicked, true);

        int updated = recommendationLogMapper.update(null, updateWrapper);
        if (updated == 0) {
            // 如果没有找到已有记录，创建一条新的点击记录
            AiRecommendationLog log = new AiRecommendationLog();
            log.setConversationId(logDTO.getConversationId());
            log.setUserId(userId);
            log.setItemType(logDTO.getItemType());
            log.setItemId(logDTO.getItemId());
            log.setPosition(logDTO.getPosition() != null ? logDTO.getPosition() : 0);
            log.setIsClicked(true);
            log.setCreatedAt(LocalDateTime.now());
            log.setUpdatedAt(LocalDateTime.now());
            log.setDeleted(0);
            recommendationLogMapper.insert(log);
        }
    }

    @Override
    public void batchSaveRecommendationLogs(Long conversationId, Long userId, List<AiConversation.RecommendedItem> items) {
        for (int i = 0; i < items.size(); i++) {
            AiConversation.RecommendedItem item = items.get(i);
            AiRecommendationLog log = new AiRecommendationLog();
            log.setConversationId(conversationId);
            log.setUserId(userId);
            log.setItemType(item.getType());
            log.setItemId(Long.parseLong(item.getId()));
            log.setPosition(i);
            log.setIsClicked(false);
            log.setCreatedAt(LocalDateTime.now());
            log.setUpdatedAt(LocalDateTime.now());
            log.setDeleted(0);
            recommendationLogMapper.insert(log);
        }
    }

    @Override
    public PageResult<AiRecommendationLog> listRecommendationLogs(AiRecommendationLogQueryDTO queryDTO) {
        LambdaQueryWrapper<AiRecommendationLog> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(queryDTO.getConversationId() != null, AiRecommendationLog::getConversationId, queryDTO.getConversationId());
        wrapper.eq(queryDTO.getUserId() != null, AiRecommendationLog::getUserId, queryDTO.getUserId());
        wrapper.eq(StringUtils.hasText(queryDTO.getItemType()), AiRecommendationLog::getItemType, queryDTO.getItemType());
        wrapper.eq(queryDTO.getIsClicked() != null, AiRecommendationLog::getIsClicked, queryDTO.getIsClicked());

        if (StringUtils.hasText(queryDTO.getStartTime())) {
            wrapper.ge(AiRecommendationLog::getCreatedAt, LocalDateTime.parse(queryDTO.getStartTime(), DTF));
        }
        if (StringUtils.hasText(queryDTO.getEndTime())) {
            wrapper.le(AiRecommendationLog::getCreatedAt, LocalDateTime.parse(queryDTO.getEndTime(), DTF));
        }

        wrapper.orderByDesc(AiRecommendationLog::getCreatedAt);

        Page<AiRecommendationLog> page = recommendationLogMapper.selectPage(
                new Page<>(queryDTO.getCurrent(), queryDTO.getSize()), wrapper
        );

        return PageResult.of(page);
    }

    @Override
    public AiStatsVO getStats(String startTime, String endTime) {
        // 默认统计最近30天
        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start = end.minusDays(30);

        if (StringUtils.hasText(startTime)) {
            start = LocalDateTime.parse(startTime, DTF);
        }
        if (StringUtils.hasText(endTime)) {
            end = LocalDateTime.parse(endTime, DTF);
        }

        AiStatsVO stats = new AiStatsVO();

        // 总对话数
        LambdaQueryWrapper<AiConversation> convWrapper = new LambdaQueryWrapper<>();
        convWrapper.ge(AiConversation::getCreatedAt, start);
        convWrapper.le(AiConversation::getCreatedAt, end);
        Long totalConversations = conversationMapper.selectCount(convWrapper);
        stats.setTotalConversations(totalConversations);

        // 转人工次数
        LambdaQueryWrapper<AiConversation> transferWrapper = new LambdaQueryWrapper<>();
        transferWrapper.ge(AiConversation::getCreatedAt, start);
        transferWrapper.le(AiConversation::getCreatedAt, end);
        transferWrapper.eq(AiConversation::getIsTransferHuman, true);
        Long transferHumanCount = conversationMapper.selectCount(transferWrapper);
        stats.setTransferHumanCount(transferHumanCount);
        stats.setTransferHumanRate(totalConversations > 0
                ? Math.round(transferHumanCount * 10000.0 / totalConversations) / 100.0
                : 0.0);

        // 总推荐次数
        LambdaQueryWrapper<AiRecommendationLog> recWrapper = new LambdaQueryWrapper<>();
        recWrapper.ge(AiRecommendationLog::getCreatedAt, start);
        recWrapper.le(AiRecommendationLog::getCreatedAt, end);
        Long totalRecommendations = recommendationLogMapper.selectCount(recWrapper);
        stats.setTotalRecommendations(totalRecommendations);

        // 总点击次数
        LambdaQueryWrapper<AiRecommendationLog> clickWrapper = new LambdaQueryWrapper<>();
        clickWrapper.ge(AiRecommendationLog::getCreatedAt, start);
        clickWrapper.le(AiRecommendationLog::getCreatedAt, end);
        clickWrapper.eq(AiRecommendationLog::getIsClicked, true);
        Long totalClicks = recommendationLogMapper.selectCount(clickWrapper);
        stats.setTotalClicks(totalClicks);
        stats.setClickRate(totalRecommendations > 0
                ? Math.round(totalClicks * 10000.0 / totalRecommendations) / 100.0
                : 0.0);

        // 按类型统计推荐次数
        List<Map<String, Object>> recByType = recommendationLogMapper.countByItemType(start, end);
        Map<String, Long> recommendationsByType = new HashMap<>();
        for (Map<String, Object> row : recByType) {
            String itemType = (String) row.get("itemType");
            Long count = ((Number) row.get("count")).longValue();
            recommendationsByType.put(itemType, count);
        }
        stats.setRecommendationsByType(recommendationsByType);

        // 按类型统计点击次数
        List<Map<String, Object>> clickByType = recommendationLogMapper.countClickedByItemType(start, end);
        Map<String, Long> clicksByType = new HashMap<>();
        for (Map<String, Object> row : clickByType) {
            String itemType = (String) row.get("itemType");
            Long count = ((Number) row.get("count")).longValue();
            clicksByType.put(itemType, count);
        }
        stats.setClicksByType(clicksByType);

        return stats;
    }

    private List<Map<String, Object>> recommendProducts(int limit) {
        LambdaQueryWrapper<Product> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Product::getStatus, "on_sale");
        wrapper.orderByDesc(Product::getSales);
        wrapper.last("LIMIT " + limit);
        return productMapper.selectList(wrapper).stream().map(product -> {
            Map<String, Object> item = new HashMap<>();
            item.put("type", "product");
            item.put("id", product.getId());
            item.put("title", product.getName());
            item.put("image", product.getMainImage());
            item.put("price", product.getPrice());
            item.put("reason", "热门商品推荐");
            return item;
        }).toList();
    }

    private List<Map<String, Object>> recommendContents(int limit) {
        LambdaQueryWrapper<Content> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Content::getStatus, "published");
        wrapper.orderByDesc(Content::getViewCount);
        wrapper.last("LIMIT " + limit);
        return contentMapper.selectList(wrapper).stream().map(content -> {
            Map<String, Object> item = new HashMap<>();
            item.put("type", "content");
            item.put("id", content.getId());
            item.put("title", content.getTitle());
            item.put("image", content.getCoverImage());
            item.put("summary", content.getSummary());
            item.put("reason", "热门内容推荐");
            return item;
        }).toList();
    }
}
