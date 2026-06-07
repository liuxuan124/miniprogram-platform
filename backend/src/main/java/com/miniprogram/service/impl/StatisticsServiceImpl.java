package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.dto.statistics.*;
import com.miniprogram.entity.Appointment;
import com.miniprogram.entity.FormData;
import com.miniprogram.entity.Order;
import com.miniprogram.entity.OrderItem;
import com.miniprogram.entity.Page;
import com.miniprogram.entity.PageAccessLog;
import com.miniprogram.entity.Product;
import com.miniprogram.entity.Refund;
import com.miniprogram.entity.StatisticsDaily;
import com.miniprogram.entity.User;
import com.miniprogram.mapper.AppointmentMapper;
import com.miniprogram.mapper.FormDataMapper;
import com.miniprogram.mapper.OrderItemMapper;
import com.miniprogram.mapper.OrderMapper;
import com.miniprogram.mapper.PageAccessLogMapper;
import com.miniprogram.mapper.PageMapper;
import com.miniprogram.mapper.ProductMapper;
import com.miniprogram.mapper.RefundMapper;
import com.miniprogram.mapper.StatisticsDailyMapper;
import com.miniprogram.mapper.UserMapper;
import com.miniprogram.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * 数据统计 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StatisticsServiceImpl implements StatisticsService {

    private final StatisticsDailyMapper statisticsDailyMapper;
    private final PageAccessLogMapper pageAccessLogMapper;
    private final OrderMapper orderMapper;
    private final OrderItemMapper orderItemMapper;
    private final ProductMapper productMapper;
    private final RefundMapper refundMapper;
    private final UserMapper userMapper;
    private final PageMapper pageMapper;
    private final AppointmentMapper appointmentMapper;
    private final FormDataMapper formDataMapper;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final String[] WEEK_LABELS = {"周一", "周二", "周三", "周四", "周五", "周六", "周日"};
    private static final DateTimeFormatter MONTH_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");

    @Override
    public DashboardVO getDashboard() {
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);

        // 今日数据 - 从业务表实时聚合
        LocalDateTime todayStart = today.atStartOfDay();
        LocalDateTime todayEnd = today.atTime(LocalTime.MAX);
        LocalDateTime yesterdayStart = yesterday.atStartOfDay();
        LocalDateTime yesterdayEnd = yesterday.atTime(LocalTime.MAX);

        // 今日订单数和销售额
        long todayOrderCount = countOrders(todayStart, todayEnd);
        BigDecimal todayOrderAmount = sumOrderAmount(todayStart, todayEnd);
        long yesterdayOrderCount = countOrders(yesterdayStart, yesterdayEnd);
        BigDecimal yesterdayOrderAmount = sumOrderAmount(yesterdayStart, yesterdayEnd);

        // 今日新增用户数
        long todayNewUsers = countNewUsers(todayStart, todayEnd);
        long yesterdayNewUsers = countNewUsers(yesterdayStart, yesterdayEnd);

        // 今日浏览量（从页面访问日志统计）
        long todayPageViews = countPageViews(todayStart, todayEnd);
        long yesterdayPageViews = countPageViews(yesterdayStart, yesterdayEnd);

        DashboardVO vo = new DashboardVO();
        vo.setTodayOrderCount((int) todayOrderCount);
        vo.setYesterdayOrderCount((int) yesterdayOrderCount);
        vo.setOrderCountChangeRate(calcChangeRate(todayOrderCount, yesterdayOrderCount));

        vo.setTodayOrderAmount(todayOrderAmount);
        vo.setYesterdayOrderAmount(yesterdayOrderAmount);
        vo.setOrderAmountChangeRate(calcChangeRate(todayOrderAmount, yesterdayOrderAmount));

        vo.setTodayNewUsers((int) todayNewUsers);
        vo.setYesterdayNewUsers((int) yesterdayNewUsers);
        vo.setNewUserChangeRate(calcChangeRate(todayNewUsers, yesterdayNewUsers));

        vo.setTodayPageViews((int) todayPageViews);
        vo.setYesterdayPageViews((int) yesterdayPageViews);
        vo.setPageViewChangeRate(calcChangeRate(todayPageViews, yesterdayPageViews));

        return vo;
    }

    @Override
    public Map<String, Object> getWorkbench() {
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);
        LocalDateTime todayStart = today.atStartOfDay();
        LocalDateTime todayEnd = today.atTime(LocalTime.MAX);
        LocalDateTime yStart = yesterday.atStartOfDay();
        LocalDateTime yEnd = yesterday.atTime(LocalTime.MAX);

        Map<String, Object> data = new LinkedHashMap<>();

        // ===== 指标卡 =====
        long todayVisits = countPageViews(todayStart, todayEnd);
        long yVisits = countPageViews(yStart, yEnd);
        long todayNewUsers = countNewUsers(todayStart, todayEnd);
        long yNewUsers = countNewUsers(yStart, yEnd);
        BigDecimal todayAmount = sumOrderAmount(todayStart, todayEnd);
        long totalForms = formDataMapper.selectCount(null);
        long todayForms = formDataMapper.selectCount(new LambdaQueryWrapper<FormData>()
                .between(FormData::getCreateTime, todayStart, todayEnd));

        long pendingShipments = orderMapper.selectCount(new LambdaQueryWrapper<Order>()
                .eq(Order::getStatus, "paid"));
        data.put("todayVisits", todayVisits);
        data.put("todayVisitsChange", changeText(todayVisits, yVisits));
        data.put("newUsers", todayNewUsers);
        data.put("newUsersChange", changeText(todayNewUsers, yNewUsers));
        data.put("formSubmissions", totalForms);
        data.put("pendingForms", todayForms);
        data.put("orderAmount", todayAmount);
        data.put("pendingShipments", pendingShipments);

        // ===== 访问趋势（近7天）=====
        List<Map<String, Object>> visitTrend = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            long c = countPageViews(d.atStartOfDay(), d.atTime(LocalTime.MAX));
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("day", WEEK_LABELS[d.getDayOfWeek().getValue() - 1]);
            item.put("count", c);
            visitTrend.add(item);
        }
        data.put("visitTrend", visitTrend);

        // ===== 汇总 =====
        long totalVisits = pageAccessLogMapper.selectCount(null);
        long totalUsers = userMapper.selectCount(null);
        long paidOrders = orderMapper.selectCount(new LambdaQueryWrapper<Order>()
                .in(Order::getStatus, List.of("paid", "shipped", "completed")));
        BigDecimal conversion = totalVisits == 0 ? BigDecimal.ZERO
                : BigDecimal.valueOf(paidOrders).multiply(new BigDecimal("100"))
                .divide(BigDecimal.valueOf(totalVisits), 1, RoundingMode.HALF_UP);
        data.put("totalVisits", totalVisits);
        data.put("totalUsers", totalUsers);
        data.put("totalForms", totalForms);
        data.put("conversionRate", conversion + "%");

        // ===== 商品排行（真实销量 Top5）=====
        List<Map<String, Object>> ranking = new ArrayList<>();
        for (ProductRankingVO p : getProductRanking("sales", 5)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("name", p.getProductName());
            m.put("sales", p.getSalesCount());
            m.put("price", p.getSalesAmount());
            ranking.add(m);
        }
        data.put("productRanking", ranking);

        // ===== 待办事项（真实计数）=====
        long draftPages = pageMapper.selectCount(new LambdaQueryWrapper<Page>().eq(Page::getStatus, 0));
        long pendingAppointments = appointmentMapper.selectCount(new LambdaQueryWrapper<Appointment>()
                .eq(Appointment::getStatus, "pending"));
        List<Map<String, Object>> todos = new ArrayList<>();
        todos.add(todo("待发布草稿页面", draftPages, "orange", "/page-builder/list"));
        todos.add(todo("累计表单提交", totalForms, "blue", "/form/submissions"));
        todos.add(todo("待发货订单记录", pendingShipments, "orange", "/order/list"));
        todos.add(todo("待确认服务预约", pendingAppointments, "red", "/appointment/list"));
        data.put("todos", todos);

        // ===== 页面版本记录（最近更新的5个页面）=====
        List<Page> recentPages = pageMapper.selectList(new LambdaQueryWrapper<Page>()
                .orderByDesc(Page::getUpdateTime).last("LIMIT 5"));
        List<Map<String, Object>> versions = new ArrayList<>();
        for (Page p : recentPages) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("name", p.getName());
            m.put("status", p.getStatus() != null && p.getStatus() == 1 ? "已发布" : (p.getStatus() != null && p.getStatus() == 2 ? "已下架" : "草稿"));
            m.put("version", "v" + (p.getCurrentVersion() == null ? 1 : p.getCurrentVersion()));
            m.put("time", p.getUpdateTime() == null ? "" : p.getUpdateTime().format(DATETIME_FORMATTER));
            versions.add(m);
        }
        data.put("versions", versions);

        return data;
    }

    private Map<String, Object> todo(String label, long count, String level, String path) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("label", label);
        m.put("count", count);
        m.put("level", level);
        m.put("path", path);
        return m;
    }

    private String changeText(long todayVal, long yVal) {
        if (yVal == 0) {
            return todayVal == 0 ? "持平" : "较昨日 +" + todayVal;
        }
        long diff = todayVal - yVal;
        BigDecimal rate = BigDecimal.valueOf(diff).multiply(new BigDecimal("100"))
                .divide(BigDecimal.valueOf(yVal), 1, RoundingMode.HALF_UP);
        return "较昨日 " + (diff >= 0 ? "+" : "") + rate + "%";
    }

    @Override
    public List<SalesTrendItemVO> getSalesTrend(LocalDate startDate, LocalDate endDate, String granularity) {
        if (startDate == null || endDate == null) {
            throw new BusinessException(ErrorCode.STATISTICS_PARAM_ERROR);
        }
        if (!StringUtils.hasText(granularity)) {
            granularity = "day";
        }
        if (!List.of("day", "week", "month").contains(granularity)) {
            throw new BusinessException(ErrorCode.STATISTICS_PARAM_ERROR);
        }

        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(LocalTime.MAX);

        // 查询时间范围内的所有订单
        List<Order> orders = orderMapper.selectList(new LambdaQueryWrapper<Order>()
                .between(Order::getCreatedAt, startDateTime, endDateTime)
                .ne(Order::getStatus, "closed"));

        // 查询时间范围内的所有退款
        List<Refund> refunds = refundMapper.selectList(new LambdaQueryWrapper<Refund>()
                .between(Refund::getCreatedAt, startDateTime, endDateTime));

        // 按粒度分组聚合
        Map<String, List<Order>> groupedOrders = groupOrdersByGranularity(orders, granularity);
        Map<String, List<Refund>> groupedRefunds = groupRefundsByGranularity(refunds, granularity);

        // 生成完整的时间序列
        List<String> periods = generatePeriods(startDate, endDate, granularity);

        List<SalesTrendItemVO> result = new ArrayList<>();
        for (String period : periods) {
            SalesTrendItemVO item = new SalesTrendItemVO();
            item.setPeriod(period);

            List<Order> periodOrders = groupedOrders.getOrDefault(period, Collections.emptyList());
            item.setOrderCount(periodOrders.size());
            item.setOrderAmount(periodOrders.stream()
                    .map(Order::getPayAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add));

            List<Refund> periodRefunds = groupedRefunds.getOrDefault(period, Collections.emptyList());
            item.setRefundCount(periodRefunds.size());
            item.setRefundAmount(periodRefunds.stream()
                    .map(Refund::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add));

            result.add(item);
        }

        return result;
    }

    @Override
    public List<ProductRankingVO> getProductRanking(String type, Integer limit) {
        if (!StringUtils.hasText(type)) {
            type = "sales";
        }
        if (!List.of("sales", "amount").contains(type)) {
            throw new BusinessException(ErrorCode.STATISTICS_PARAM_ERROR);
        }
        if (limit == null || limit <= 0) {
            limit = 10;
        }
        if (limit > 100) {
            limit = 100;
        }

        // 查询所有已支付/已完成的订单项
        List<Order> validOrders = orderMapper.selectList(new LambdaQueryWrapper<Order>()
                .in(Order::getStatus, List.of("paid", "shipped", "completed", "refunding", "refunded")));

        if (validOrders.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> orderIds = validOrders.stream().map(Order::getId).toList();
        List<OrderItem> orderItems = orderItemMapper.selectList(new LambdaQueryWrapper<OrderItem>()
                .in(OrderItem::getOrderId, orderIds));

        // 按商品ID聚合
        Map<Long, Integer> salesCountMap = new LinkedHashMap<>();
        Map<Long, BigDecimal> salesAmountMap = new LinkedHashMap<>();
        for (OrderItem item : orderItems) {
            salesCountMap.merge(item.getProductId(), item.getQuantity(), Integer::sum);
            salesAmountMap.merge(item.getProductId(), item.getSubtotal(), BigDecimal::add);
        }

        // 排序
        List<Long> sortedProductIds;
        if ("sales".equals(type)) {
            sortedProductIds = salesCountMap.entrySet().stream()
                    .sorted(Map.Entry.<Long, Integer>comparingByValue().reversed())
                    .limit(limit)
                    .map(Map.Entry::getKey)
                    .toList();
        } else {
            sortedProductIds = salesAmountMap.entrySet().stream()
                    .sorted(Map.Entry.<Long, BigDecimal>comparingByValue().reversed())
                    .limit(limit)
                    .map(Map.Entry::getKey)
                    .toList();
        }

        // 构建结果
        List<ProductRankingVO> result = new ArrayList<>();
        for (Long productId : sortedProductIds) {
            Product product = productMapper.selectById(productId);
            if (product == null) continue;

            ProductRankingVO vo = new ProductRankingVO();
            vo.setProductId(product.getId());
            vo.setProductName(product.getName());
            vo.setProductImage(product.getMainImage());
            vo.setSalesCount(salesCountMap.getOrDefault(productId, 0));
            vo.setSalesAmount(salesAmountMap.getOrDefault(productId, BigDecimal.ZERO));
            result.add(vo);
        }

        return result;
    }

    @Override
    public List<UserGrowthItemVO> getUserGrowth(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new BusinessException(ErrorCode.STATISTICS_PARAM_ERROR);
        }

        List<UserGrowthItemVO> result = new ArrayList<>();

        // 查询总用户数（截止到开始日期之前）
        long cumulativeUsers = userMapper.selectCount(new LambdaQueryWrapper<User>()
                .lt(User::getCreateTime, startDate.atStartOfDay()));

        // 逐日统计
        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            LocalDateTime dayStart = current.atStartOfDay();
            LocalDateTime dayEnd = current.atTime(LocalTime.MAX);

            long newUsers = userMapper.selectCount(new LambdaQueryWrapper<User>()
                    .between(User::getCreateTime, dayStart, dayEnd));

            cumulativeUsers += newUsers;

            UserGrowthItemVO item = new UserGrowthItemVO();
            item.setDate(current.format(DATE_FORMATTER));
            item.setNewUsers((int) newUsers);
            item.setTotalUsers((int) cumulativeUsers);
            result.add(item);

            current = current.plusDays(1);
        }

        return result;
    }

    @Override
    public List<PageAccessStatsVO> getPageAccessStats(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new BusinessException(ErrorCode.STATISTICS_PARAM_ERROR);
        }

        String startDateTime = startDate.atStartOfDay().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        String endDateTime = endDate.atTime(LocalTime.MAX).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

        List<Map<String, Object>> stats = pageAccessLogMapper.selectPageAccessStats(startDateTime, endDateTime);

        List<PageAccessStatsVO> result = new ArrayList<>();
        for (Map<String, Object> stat : stats) {
            PageAccessStatsVO vo = new PageAccessStatsVO();
            vo.setPagePath((String) stat.get("page_path"));
            vo.setAccessCount(((Number) stat.get("access_count")).longValue());
            vo.setVisitorCount(((Number) stat.get("visitor_count")).longValue());
            Object avgDuration = stat.get("avg_stay_duration");
            if (avgDuration instanceof Number) {
                vo.setAvgStayDuration(BigDecimal.valueOf(((Number) avgDuration).doubleValue()).setScale(1, RoundingMode.HALF_UP));
            } else {
                vo.setAvgStayDuration(BigDecimal.ZERO);
            }
            result.add(vo);
        }

        return result;
    }

    @Override
    @Async
    public void reportPageAccess(Long userId, PageAccessReportDTO reportDTO) {
        try {
            PageAccessLog accessLog = new PageAccessLog();
            accessLog.setPageId(reportDTO.getPageId());
            accessLog.setPagePath(reportDTO.getPagePath());
            accessLog.setUserId(userId);
            accessLog.setSessionId(reportDTO.getSessionId());
            accessLog.setSource(reportDTO.getSource());
            accessLog.setStayDuration(reportDTO.getStayDuration() != null ? reportDTO.getStayDuration() : 0);
            pageAccessLogMapper.insert(accessLog);
        } catch (Exception e) {
            log.error("页面访问日志写入失败: pagePath={}, userId={}", reportDTO.getPagePath(), userId, e);
        }
    }

    // ==================== 私有方法 ====================

    /**
     * 统计指定时间范围内的订单数
     */
    private long countOrders(LocalDateTime start, LocalDateTime end) {
        return orderMapper.selectCount(new LambdaQueryWrapper<Order>()
                .between(Order::getCreatedAt, start, end)
                .ne(Order::getStatus, "closed"));
    }

    /**
     * 统计指定时间范围内的订单销售额
     */
    private BigDecimal sumOrderAmount(LocalDateTime start, LocalDateTime end) {
        List<Order> orders = orderMapper.selectList(new LambdaQueryWrapper<Order>()
                .between(Order::getCreatedAt, start, end)
                .ne(Order::getStatus, "closed"));
        return orders.stream()
                .map(Order::getPayAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * 统计指定时间范围内的新增用户数
     */
    private long countNewUsers(LocalDateTime start, LocalDateTime end) {
        return userMapper.selectCount(new LambdaQueryWrapper<User>()
                .between(User::getCreateTime, start, end));
    }

    /**
     * 统计指定时间范围内的页面浏览量
     */
    private long countPageViews(LocalDateTime start, LocalDateTime end) {
        String startStr = start.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        String endStr = end.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        return pageAccessLogMapper.selectCount(new LambdaQueryWrapper<PageAccessLog>()
                .between(PageAccessLog::getCreatedAt, start, end));
    }

    /**
     * 计算环比变化率
     */
    private BigDecimal calcChangeRate(long todayValue, long yesterdayValue) {
        return calcChangeRate(BigDecimal.valueOf(todayValue), BigDecimal.valueOf(yesterdayValue));
    }

    private BigDecimal calcChangeRate(BigDecimal todayValue, BigDecimal yesterdayValue) {
        if (yesterdayValue.compareTo(BigDecimal.ZERO) == 0) {
            return todayValue.compareTo(BigDecimal.ZERO) == 0
                    ? BigDecimal.ZERO
                    : new BigDecimal("100");
        }
        return todayValue.subtract(yesterdayValue)
                .multiply(new BigDecimal("100"))
                .divide(yesterdayValue, 2, RoundingMode.HALF_UP);
    }

    /**
     * 按粒度分组订单
     */
    private Map<String, List<Order>> groupOrdersByGranularity(List<Order> orders, String granularity) {
        Map<String, List<Order>> grouped = new LinkedHashMap<>();
        for (Order order : orders) {
            String key = getPeriodKey(order.getCreatedAt().toLocalDate(), granularity);
            grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(order);
        }
        return grouped;
    }

    /**
     * 按粒度分组退款
     */
    private Map<String, List<Refund>> groupRefundsByGranularity(List<Refund> refunds, String granularity) {
        Map<String, List<Refund>> grouped = new LinkedHashMap<>();
        for (Refund refund : refunds) {
            String key = getPeriodKey(refund.getCreatedAt().toLocalDate(), granularity);
            grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(refund);
        }
        return grouped;
    }

    /**
     * 获取日期对应的粒度键
     */
    private String getPeriodKey(LocalDate date, String granularity) {
        return switch (granularity) {
            case "week" -> {
                WeekFields weekFields = WeekFields.of(Locale.CHINA);
                int weekNumber = date.get(weekFields.weekOfWeekBasedYear());
                int year = date.get(weekFields.weekBasedYear());
                yield year + "-W" + String.format("%02d", weekNumber);
            }
            case "month" -> date.format(MONTH_FORMATTER);
            default -> date.format(DATE_FORMATTER);
        };
    }

    /**
     * 生成完整的时间序列
     */
    private List<String> generatePeriods(LocalDate startDate, LocalDate endDate, String granularity) {
        List<String> periods = new ArrayList<>();
        LocalDate current = startDate;

        while (!current.isAfter(endDate)) {
            periods.add(getPeriodKey(current, granularity));
            current = switch (granularity) {
                case "week" -> current.plusWeeks(1);
                case "month" -> current.plusMonths(1);
                default -> current.plusDays(1);
            };
        }

        // 去重（周/月粒度可能重复）
        return periods.stream().distinct().toList();
    }
}
