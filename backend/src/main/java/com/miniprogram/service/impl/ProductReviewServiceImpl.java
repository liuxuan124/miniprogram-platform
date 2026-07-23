package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.dto.ProductReviewCreateDTO;
import com.miniprogram.dto.ProductReviewSummaryVO;
import com.miniprogram.dto.ProductReviewVO;
import com.miniprogram.entity.ProductReview;
import com.miniprogram.mapper.ProductReviewMapper;
import com.miniprogram.service.ProductReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductReviewServiceImpl extends ServiceImpl<ProductReviewMapper, ProductReview>
        implements ProductReviewService {

    private final ObjectMapper objectMapper;

    @Override
    public ProductReviewSummaryVO listByProduct(Long productId, String tag, Integer current, Integer size) {
        int pageNum = current == null || current < 1 ? 1 : current;
        int pageSize = size == null || size < 1 ? 20 : Math.min(size, 50);

        LambdaQueryWrapper<ProductReview> allQw = new LambdaQueryWrapper<ProductReview>()
                .eq(ProductReview::getProductId, productId)
                .eq(ProductReview::getStatus, 1);
        List<ProductReview> all = this.list(allQw);

        Map<Integer, Long> dist = new LinkedHashMap<>();
        for (int i = 5; i >= 1; i--) dist.put(i, 0L);
        double sum = 0;
        Map<String, Long> tagCount = new HashMap<>();
        for (ProductReview r : all) {
            int s = r.getScore() == null ? 5 : r.getScore();
            dist.put(s, dist.getOrDefault(s, 0L) + 1);
            sum += s;
            if (StringUtils.hasText(r.getTags())) {
                for (String t : r.getTags().split(",")) {
                    String k = t.trim();
                    if (!k.isEmpty()) tagCount.merge(k, 1L, Long::sum);
                }
            }
        }

        LambdaQueryWrapper<ProductReview> qw = new LambdaQueryWrapper<ProductReview>()
                .eq(ProductReview::getProductId, productId)
                .eq(ProductReview::getStatus, 1)
                .orderByDesc(ProductReview::getId);
        if (StringUtils.hasText(tag)) {
            qw.like(ProductReview::getTags, tag.trim());
        }
        Page<ProductReview> page = this.page(new Page<>(pageNum, pageSize), qw);

        ProductReviewSummaryVO vo = new ProductReviewSummaryVO();
        vo.setTotal((long) all.size());
        vo.setAvgScore(all.isEmpty() ? 0.0 : Math.round(sum / all.size() * 10) / 10.0);
        vo.setScoreDist(dist);
        vo.setHotTags(tagCount.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(8)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList()));
        vo.setRecords(page.getRecords().stream().map(this::toVO).collect(Collectors.toList()));
        return vo;
    }

    @Override
    public ProductReviewVO create(Long userId, ProductReviewCreateDTO dto) {
        ProductReview entity = new ProductReview();
        entity.setProductId(dto.getProductId());
        entity.setUserId(userId);
        entity.setOrderId(dto.getOrderId());
        entity.setScore(dto.getScore());
        entity.setTags(dto.getTags() == null ? null : String.join(",", dto.getTags()));
        entity.setContent(dto.getContent());
        entity.setImages(toJson(dto.getImages()));
        boolean anon = Boolean.TRUE.equals(dto.getAnonymous());
        entity.setAnonymous(anon ? 1 : 0);
        entity.setNickname(anon ? "匿名用户" : "微信用户");
        entity.setStatus(1);
        this.save(entity);
        return toVO(entity);
    }

    private ProductReviewVO toVO(ProductReview r) {
        ProductReviewVO vo = new ProductReviewVO();
        vo.setId(r.getId());
        vo.setProductId(r.getProductId());
        vo.setScore(r.getScore());
        vo.setContent(r.getContent());
        vo.setAnonymous(r.getAnonymous() != null && r.getAnonymous() == 1);
        vo.setNickname(r.getNickname());
        vo.setAvatar(r.getAvatar());
        vo.setCreateTime(r.getCreateTime());
        if (StringUtils.hasText(r.getTags())) {
            vo.setTags(Arrays.stream(r.getTags().split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList());
        } else {
            vo.setTags(Collections.emptyList());
        }
        vo.setImages(parseList(r.getImages()));
        return vo;
    }

    private String toJson(List<String> list) {
        if (list == null || list.isEmpty()) return "[]";
        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            return "[]";
        }
    }

    private List<String> parseList(String json) {
        if (!StringUtils.hasText(json)) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
