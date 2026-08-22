package com.miniprogram.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.R;
import com.miniprogram.entity.*;
import com.miniprogram.mapper.*;
import com.miniprogram.service.SubscribeMessageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Tag(name = "增长与数据运营后台")
@RestController
@RequestMapping("/api/v1/admin/growth")
@RequiredArgsConstructor
public class GrowthAdminController {

    private final AnalyticsEventMapper analyticsEventMapper;
    private final SearchLogMapper searchLogMapper;
    private final CouponEffectMapper couponEffectMapper;
    private final SubscribeTemplateMapper subscribeTemplateMapper;
    private final SubscribeLogMapper subscribeLogMapper;
    private final PageExperimentMapper pageExperimentMapper;
    private final OrderMapper orderMapper;
    private final SubscribeMessageService subscribeMessageService;

    @Operation(summary = "AI 日洞察文案（规则 MVP）")
    @GetMapping("/insight-narrative")
    public R<Map<String, Object>> insightNarrative() {
        Map<String, Object> funnelData = buildFunnel(1);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> steps = (List<Map<String, Object>>) funnelData.get("funnel");
        long views = steps.stream().filter(s -> "page_view".equals(s.get("event"))).mapToLong(s -> ((Number) s.get("count")).longValue()).findFirst().orElse(0);
        long pays = steps.stream().filter(s -> "pay_success".equals(s.get("event"))).mapToLong(s -> ((Number) s.get("count")).longValue()).findFirst().orElse(0);
        String text;
        if (views == 0) {
            text = "昨天几乎没有埋点事件上报。请确认小程序已接入事件上报，并检查正式版是否已发布。";
        } else if (pays == 0) {
            text = "昨天有 " + views + " 次页面浏览，但支付成功为 0。建议检查商品详情→下单漏斗，或用优惠券刺激首单。";
        } else {
            double rate = views > 0 ? (pays * 100.0 / views) : 0;
            text = String.format("昨天浏览 %d、支付成功 %d，浏览→支付约 %.1f%%。可对比装修改版前后组件点击，决定是否回滚或加码热区。", views, pays, rate);
        }
        Map<String, Object> data = new HashMap<>();
        data.put("narrative", text);
        data.put("actions", List.of(
                Map.of("label", "查看漏斗", "path", "/growth/overview"),
                Map.of("label", "去装修", "path", "/page-builder/pages")
        ));
        return R.ok(data);
    }

    private Map<String, Object> buildFunnel(int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(Math.max(1, days));
        List<AnalyticsEvent> list = analyticsEventMapper.selectList(new LambdaQueryWrapper<AnalyticsEvent>()
                .ge(AnalyticsEvent::getCreateTime, since));
        Map<String, Long> counts = list.stream()
                .collect(Collectors.groupingBy(e -> e.getEventName() == null ? "unknown" : e.getEventName(), Collectors.counting()));
        List<String> steps = List.of("page_view", "component_click", "product_view", "add_cart", "order_create", "pay_success");
        List<Map<String, Object>> funnel = new ArrayList<>();
        for (String s : steps) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("event", s);
            row.put("count", counts.getOrDefault(s, 0L));
            funnel.add(row);
        }
        Map<String, Object> data = new HashMap<>();
        data.put("funnel", funnel);
        data.put("allEvents", counts);
        data.put("days", days);
        return data;
    }

    @Operation(summary = "事件漏斗（简化）")
    @GetMapping("/funnel")
    public R<Map<String, Object>> funnel(@RequestParam(defaultValue = "7") int days) {
        return R.ok(buildFunnel(days));
    }

    @Operation(summary = "组件热力（点击/曝光聚合）")
    @GetMapping("/component-heat")
    public R<List<Map<String, Object>>> componentHeat(@RequestParam(defaultValue = "7") int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(Math.max(1, days));
        List<AnalyticsEvent> list = analyticsEventMapper.selectList(new LambdaQueryWrapper<AnalyticsEvent>()
                .ge(AnalyticsEvent::getCreateTime, since)
                .isNotNull(AnalyticsEvent::getComponentId)
                .ne(AnalyticsEvent::getComponentId, ""));
        Map<String, long[]> agg = new LinkedHashMap<>();
        for (AnalyticsEvent e : list) {
            String cid = e.getComponentId();
            if (!StringUtils.hasText(cid)) continue;
            long[] pair = agg.computeIfAbsent(cid, k -> new long[2]);
            String name = e.getEventName() == null ? "" : e.getEventName();
            if ("component_click".equals(name) || "click".equals(name)) {
                pair[0]++; // clicks
            } else if ("component_impression".equals(name) || "component_view".equals(name)
                    || "impression".equals(name) || "page_view".equals(name)) {
                pair[1]++; // impressions
            } else {
                pair[1]++; // 其它带 componentId 的事件计为曝光
            }
        }
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Map.Entry<String, long[]> en : agg.entrySet()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("componentId", en.getKey());
            m.put("clicks", en.getValue()[0]);
            m.put("impressions", Math.max(en.getValue()[1], en.getValue()[0]));
            rows.add(m);
        }
        rows.sort((a, b) -> Long.compare(((Number) b.get("clicks")).longValue(), ((Number) a.get("clicks")).longValue()));
        return R.ok(rows);
    }

    @Operation(summary = "优惠券效果汇总")
    @GetMapping("/coupon-effect")
    public R<Map<String, Object>> couponEffect() {
        List<CouponEffect> list = couponEffectMapper.selectList(new LambdaQueryWrapper<CouponEffect>()
                .orderByDesc(CouponEffect::getCreateTime).last("LIMIT 2000"));
        long useCount = list.stream().filter(e -> "use".equals(e.getAction())).count();
        BigDecimal discount = list.stream()
                .filter(e -> "use".equals(e.getAction()) && e.getDiscountAmount() != null)
                .map(CouponEffect::getDiscountAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal gmv = list.stream()
                .filter(e -> "use".equals(e.getAction()) && e.getOrderPayAmount() != null)
                .map(CouponEffect::getOrderPayAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, Object> data = new HashMap<>();
        data.put("useCount", useCount);
        data.put("discountTotal", discount);
        data.put("payGmv", gmv);
        data.put("recent", list.stream().limit(50).toList());
        return R.ok(data);
    }

    @Operation(summary = "搜索洞察（后台）")
    @GetMapping("/search-insights")
    public R<Map<String, Object>> searchInsights() {
        List<SearchLog> recent = searchLogMapper.selectList(new LambdaQueryWrapper<SearchLog>()
                .orderByDesc(SearchLog::getCreateTime).last("LIMIT 800"));
        Map<String, Integer> hot = new LinkedHashMap<>();
        Map<String, Integer> zero = new LinkedHashMap<>();
        for (SearchLog s : recent) {
            hot.merge(s.getKeyword(), 1, Integer::sum);
            if (s.getResultCount() != null && s.getResultCount() == 0) {
                zero.merge(s.getKeyword(), 1, Integer::sum);
            }
        }
        Map<String, Object> data = new HashMap<>();
        data.put("hot", topN(hot, 30));
        data.put("noResult", topN(zero, 30));
        return R.ok(data);
    }

    @Operation(summary = "内容带货榜")
    @GetMapping("/content-gmv")
    public R<List<Map<String, Object>>> contentGmv() {
        List<Order> orders = orderMapper.selectList(new LambdaQueryWrapper<Order>()
                .isNotNull(Order::getSourceContentId)
                .in(Order::getStatus, List.of("paid", "shipped", "completed"))
                .orderByDesc(Order::getPaidAt)
                .last("LIMIT 500"));
        Map<Long, BigDecimal> gmv = new LinkedHashMap<>();
        Map<Long, Long> cnt = new LinkedHashMap<>();
        for (Order o : orders) {
            Long cid = o.getSourceContentId();
            if (cid == null) continue;
            gmv.merge(cid, o.getPayAmount() == null ? BigDecimal.ZERO : o.getPayAmount(), BigDecimal::add);
            cnt.merge(cid, 1L, Long::sum);
        }
        return R.ok(gmv.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .limit(20)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("contentId", e.getKey());
                    m.put("gmv", e.getValue());
                    m.put("orderCount", cnt.getOrDefault(e.getKey(), 0L));
                    return m;
                }).toList());
    }

    @GetMapping("/subscribe/templates")
    public R<List<SubscribeTemplate>> listTemplates() {
        return R.ok(subscribeTemplateMapper.selectList(new LambdaQueryWrapper<SubscribeTemplate>().orderByAsc(SubscribeTemplate::getId)));
    }

    @PutMapping("/subscribe/templates")
    @PreAuthorize("hasRole('super_admin') or hasAuthority('system:config')")
    public R<Void> saveTemplate(@RequestBody SubscribeTemplate body) {
        if (body == null || !StringUtils.hasText(body.getScene())) {
            return R.fail(400201, "scene 必填");
        }
        SubscribeTemplate exists = subscribeTemplateMapper.selectOne(new LambdaQueryWrapper<SubscribeTemplate>()
                .eq(SubscribeTemplate::getScene, body.getScene()).last("LIMIT 1"));
        if (exists == null) {
            body.setId(null);
            body.setCreateTime(LocalDateTime.now());
            if (body.getEnabled() == null) body.setEnabled(1);
            subscribeTemplateMapper.insert(body);
        } else {
            exists.setTemplateId(body.getTemplateId());
            exists.setTitle(body.getTitle());
            exists.setEnabled(body.getEnabled() == null ? 1 : body.getEnabled());
            subscribeTemplateMapper.updateById(exists);
        }
        return R.ok();
    }

    @GetMapping("/subscribe/logs")
    public R<List<SubscribeLog>> subscribeLogs() {
        return R.ok(subscribeLogMapper.selectList(new LambdaQueryWrapper<SubscribeLog>()
                .orderByDesc(SubscribeLog::getCreateTime).last("LIMIT 100")));
    }

    @PostMapping("/subscribe/test")
    public R<Void> testSubscribe(@RequestBody TestSub body) {
        subscribeMessageService.enqueue(body.getUserId(), body.getScene(), body.getBizId(), Map.of("test", true));
        return R.ok();
    }

    @GetMapping("/experiments")
    public R<List<PageExperiment>> experiments() {
        return R.ok(pageExperimentMapper.selectList(new LambdaQueryWrapper<PageExperiment>().orderByDesc(PageExperiment::getId)));
    }

    @PostMapping("/experiments")
    @PreAuthorize("hasRole('super_admin') or hasAuthority('system:config')")
    public R<PageExperiment> createExperiment(@RequestBody PageExperiment body) {
        body.setId(null);
        body.setCreateTime(LocalDateTime.now());
        if (!StringUtils.hasText(body.getStatus())) body.setStatus("running");
        if (body.getTrafficB() == null) body.setTrafficB(50);
        pageExperimentMapper.insert(body);
        return R.ok(body);
    }

    private List<Map<String, Object>> topN(Map<String, Integer> map, int n) {
        return map.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                .limit(n)
                .map(e -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("keyword", e.getKey());
                    m.put("count", e.getValue());
                    return m;
                }).toList();
    }

    @Data
    public static class TestSub {
        private Long userId;
        private String scene;
        private String bizId;
    }
}
