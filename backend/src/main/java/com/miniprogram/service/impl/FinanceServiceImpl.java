package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.finance.*;
import com.miniprogram.entity.FinanceBudget;
import com.miniprogram.entity.FinanceBudgetAlert;
import com.miniprogram.entity.FinanceInvoice;
import com.miniprogram.entity.FinancePermission;
import com.miniprogram.entity.FinanceRole;
import com.miniprogram.entity.FinanceSyncConfig;
import com.miniprogram.entity.FinanceTransaction;
import com.miniprogram.entity.AdminUser;
import com.miniprogram.entity.Order;
import com.miniprogram.mapper.FinanceBudgetAlertMapper;
import com.miniprogram.mapper.FinanceBudgetMapper;
import com.miniprogram.mapper.FinanceInvoiceMapper;
import com.miniprogram.mapper.FinancePermissionMapper;
import com.miniprogram.mapper.FinanceRoleMapper;
import com.miniprogram.mapper.FinanceSyncConfigMapper;
import com.miniprogram.mapper.FinanceTransactionMapper;
import com.miniprogram.mapper.AdminUserMapper;
import com.miniprogram.mapper.OrderMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniprogram.service.FinanceService;
import com.miniprogram.support.ExcelExportHelper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import jakarta.annotation.PostConstruct;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 财务管理 Service 实现
 */
@Service
@RequiredArgsConstructor
public class FinanceServiceImpl implements FinanceService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private static final String COST_OF_GOODS_CATEGORY = "采购成本";
    private static final List<String> DEFAULT_ROLE_PERMISSIONS = List.of("finance:view");

    private final FinanceTransactionMapper transactionMapper;
    private final FinanceBudgetMapper budgetMapper;
    private final FinanceInvoiceMapper invoiceMapper;
    private final FinanceRoleMapper financeRoleMapper;
    private final FinancePermissionMapper financePermissionMapper;
    private final FinanceSyncConfigMapper syncConfigMapper;
    private final FinanceBudgetAlertMapper budgetAlertMapper;
    private final AdminUserMapper adminUserMapper;
    private final OrderMapper orderMapper;
    private final ObjectMapper objectMapper;

    @PostConstruct
    public void initializeBudgetUsage() {
        try {
            recalculateAllBudgets();
        } catch (Exception ignored) {
            // 表未迁移时跳过
        }
    }

    // ==================== 财务概览 ====================

    @Override
    public FinanceDashboardVO getDashboard() {
        syncPaidOrdersToFinance();
        LocalDate now = LocalDate.now();
        LocalDate monthStart = now.withDayOfMonth(1);
        LocalDate prevMonthStart = monthStart.minusMonths(1);
        LocalDate prevMonthEnd = monthStart.minusDays(1);

        // 概览卡片与环比统一为本月口径（已审批流水），避免「累计金额 + 本月环比」误导
        BigDecimal currentIncome = sumTransactionAmount("income", monthStart, now);
        BigDecimal currentExpense = sumTransactionAmount("expense", monthStart, now);
        BigDecimal previousIncome = sumTransactionAmount("income", prevMonthStart, prevMonthEnd);
        BigDecimal previousExpense = sumTransactionAmount("expense", prevMonthStart, prevMonthEnd);
        BigDecimal currentProfit = currentIncome.subtract(currentExpense);
        BigDecimal previousProfit = previousIncome.subtract(previousExpense);

        Long pendingInvoices = invoiceMapper.selectCount(new LambdaQueryWrapper<FinanceInvoice>()
                .in(FinanceInvoice::getInvoiceStatus, "pending", "draft"));

        FinanceDashboardVO vo = new FinanceDashboardVO();
        vo.setTotalIncome(currentIncome);
        vo.setTotalExpense(currentExpense);
        vo.setNetProfit(currentProfit);
        vo.setPendingInvoiceCount(pendingInvoices != null ? pendingInvoices.intValue() : 0);
        vo.setBudgetUsageRate(calculateAverageBudgetUsageRate());
        vo.setIncomeChange(calculateChangeRate(currentIncome, previousIncome));
        vo.setExpenseChange(calculateChangeRate(currentExpense, previousExpense));
        vo.setProfitChange(calculateChangeRate(currentProfit, previousProfit));
        return vo;
    }

    @Override
    public List<FinanceTrendVO> getTrend(String startDate, String endDate, String granularity) {
        LocalDate start = LocalDate.parse(startDate, DATE_FORMATTER);
        LocalDate end = endDate != null ? LocalDate.parse(endDate, DATE_FORMATTER) : start.plusMonths(5);
        String grain = granularity == null || granularity.isBlank() ? "month" : granularity.toLowerCase(Locale.ROOT);

        List<FinanceTransaction> transactions = listTransactionsBetween(start, end);
        Map<String, FinanceTrendVO> trendMap = new LinkedHashMap<>();

        if ("day".equals(grain)) {
            LocalDate current = start;
            while (!current.isAfter(end)) {
                String key = current.format(DATE_FORMATTER);
                trendMap.put(key, emptyTrend(key));
                current = current.plusDays(1);
            }
        } else if ("week".equals(grain)) {
            LocalDate cursor = start;
            while (!cursor.isAfter(end)) {
                String key = weekKey(cursor);
                trendMap.putIfAbsent(key, emptyTrend(key));
                cursor = cursor.plusDays(1);
            }
        } else if ("quarter".equals(grain)) {
            YearMonth cursor = YearMonth.from(start);
            YearMonth endMonth = YearMonth.from(end);
            while (!cursor.isAfter(endMonth)) {
                String key = quarterKey(cursor);
                trendMap.putIfAbsent(key, emptyTrend(key));
                cursor = cursor.plusMonths(1);
            }
        } else if ("year".equals(grain)) {
            int y = start.getYear();
            int endY = end.getYear();
            while (y <= endY) {
                String key = String.valueOf(y);
                trendMap.put(key, emptyTrend(key));
                y++;
            }
        } else {
            // month（默认）
            YearMonth cursor = YearMonth.from(start);
            YearMonth endMonth = YearMonth.from(end);
            while (!cursor.isAfter(endMonth)) {
                trendMap.put(cursor.toString(), emptyTrend(cursor.toString()));
                cursor = cursor.plusMonths(1);
            }
        }

        for (FinanceTransaction transaction : transactions) {
            if (transaction.getTransactionDate() == null) {
                continue;
            }
            String key = trendBucketKey(transaction.getTransactionDate(), grain);
            FinanceTrendVO trend = trendMap.computeIfAbsent(key, this::emptyTrend);
            applyTransactionToTrend(trend, transaction);
        }

        trendMap.values().forEach(trend -> trend.setProfit(
                safeAmount(trend.getIncome()).subtract(safeAmount(trend.getExpense()))
        ));
        return new ArrayList<>(trendMap.values());
    }

    @Override
    public List<FinanceCategorySummaryVO> getIncomeCategorySummary(String startDate, String endDate) {
        return buildCategorySummary("income", parseDate(startDate), parseDate(endDate));
    }

    @Override
    public List<FinanceCategorySummaryVO> getExpenseCategorySummary(String startDate, String endDate) {
        return buildCategorySummary("expense", parseDate(startDate), parseDate(endDate));
    }

    // ==================== 收支明细 ====================

    @Override
    public PageResult<FinanceTransactionVO> listTransactions(Integer page, Integer pageSize, String keyword,
                                                              String type, String category, String startDate,
                                                              String endDate, String approvalStatus, String invoiceStatus) {
        LambdaQueryWrapper<FinanceTransaction> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(type != null && !type.isBlank(), FinanceTransaction::getType, type)
                .eq(category != null && !category.isBlank(), FinanceTransaction::getCategory, category)
                .eq(approvalStatus != null && !approvalStatus.isBlank(), FinanceTransaction::getApprovalStatus, approvalStatus)
                .eq(invoiceStatus != null && !invoiceStatus.isBlank(), FinanceTransaction::getInvoiceStatus, invoiceStatus)
                .ge(startDate != null && !startDate.isBlank(), FinanceTransaction::getTransactionDate, startDate)
                .le(endDate != null && !endDate.isBlank(), FinanceTransaction::getTransactionDate, endDate)
                .and(keyword != null && !keyword.isBlank(), w -> w
                        .like(FinanceTransaction::getDescription, keyword)
                        .or().like(FinanceTransaction::getCounterparty, keyword)
                        .or().like(FinanceTransaction::getCategory, keyword))
                .orderByDesc(FinanceTransaction::getTransactionDate)
                .orderByDesc(FinanceTransaction::getId);

        int p = page != null ? page : 1;
        int s = pageSize != null ? pageSize : 20;
        Page<FinanceTransaction> result = transactionMapper.selectPage(new Page<>(p, s), wrapper);
        List<FinanceTransactionVO> records = result.getRecords().stream().map(this::toTransactionVO).toList();
        return new PageResult<>(records, result.getTotal(), result.getCurrent(), result.getSize());
    }

    @Override
    public FinanceTransactionVO getTransaction(Long id) {
        return toTransactionVO(getTransactionEntity(id));
    }

    @Override
    @Transactional
    public FinanceTransactionVO createTransaction(FinanceTransactionDTO dto) {
        FinanceTransaction entity = new FinanceTransaction();
        applyTransactionDto(entity, dto, true);
        entity.setApprovalStatus("pending");
        entity.setCreatedBy("admin");
        entity.setCreateTime(LocalDateTime.now());
        entity.setUpdateTime(LocalDateTime.now());
        transactionMapper.insert(entity);
        return toTransactionVO(entity);
    }

    @Override
    @Transactional
    public FinanceTransactionVO updateTransaction(Long id, FinanceTransactionDTO dto) {
        FinanceTransaction entity = getTransactionEntity(id);
        String previousApproval = entity.getApprovalStatus();
        applyTransactionDto(entity, dto, false);
        entity.setId(id);
        entity.setUpdateTime(LocalDateTime.now());
        // 已审批/已驳回记录被修改后需重新审批，避免静默改写已入账数据
        if ("approved".equals(previousApproval) || "rejected".equals(previousApproval)) {
            entity.setApprovalStatus("pending");
            entity.setApprovalReason(null);
        }
        transactionMapper.updateById(entity);
        recalculateAllBudgets();
        return toTransactionVO(entity);
    }

    @Override
    @Transactional
    public void deleteTransaction(Long id) {
        transactionMapper.deleteById(id);
        recalculateAllBudgets();
    }

    @Override
    @Transactional
    public void approveTransaction(Long id, String approvalStatus, String reason) {
        if (!"approved".equals(approvalStatus) && !"rejected".equals(approvalStatus)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "审批状态无效");
        }
        FinanceTransaction entity = getTransactionEntity(id);
        if (!"pending".equals(entity.getApprovalStatus())) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "仅待审批记录可审批");
        }
        entity.setApprovalStatus(approvalStatus);
        entity.setApprovalReason(reason);
        entity.setUpdateTime(LocalDateTime.now());
        transactionMapper.updateById(entity);
        recalculateAllBudgets();
    }

    @Override
    @Transactional
    public Map<String, Object> importTransactions(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "请上传 CSV 文件");
        }
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase(Locale.ROOT) : "";
        if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "暂不支持 Excel，请上传 CSV 文件");
        }
        if (!filename.isEmpty() && !filename.endsWith(".csv")) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "请上传 CSV 文件");
        }
        int success = 0;
        int failed = 0;
        List<String> errors = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), java.nio.charset.StandardCharsets.UTF_8))) {
            String line;
            int rowNum = 0;
            while ((line = reader.readLine()) != null) {
                rowNum++;
                if (line.isBlank()) {
                    continue;
                }
                // 兼容 UTF-8 BOM
                if (rowNum == 1 && line.startsWith("\uFEFF")) {
                    line = line.substring(1);
                }
                if (rowNum == 1 && line.toLowerCase(Locale.ROOT).startsWith("type,")) {
                    continue;
                }
                List<String> cols = parseCsvLine(line);
                if (cols.size() < 4) {
                    failed++;
                    errors.add("第" + rowNum + "行列数不足");
                    continue;
                }
                try {
                    FinanceTransactionDTO dto = new FinanceTransactionDTO();
                    dto.setType(cols.get(0).trim());
                    dto.setAmount(new BigDecimal(cols.get(1).trim()));
                    dto.setCategory(cols.get(2).trim());
                    dto.setSubCategory(cols.size() > 3 && !cols.get(3).trim().isEmpty() ? cols.get(3).trim() : null);
                    dto.setDescription(cols.size() > 4 ? emptyToNull(cols.get(4).trim()) : null);
                    dto.setTransactionDate(cols.size() > 5 && !cols.get(5).trim().isEmpty()
                            ? cols.get(5).trim() : LocalDate.now().format(DATE_FORMATTER));
                    String payment = cols.size() > 6 ? cols.get(6).trim() : "";
                    dto.setPaymentMethod(payment.isEmpty() ? "other" : payment);
                    dto.setCounterparty(cols.size() > 7 ? emptyToNull(cols.get(7).trim()) : null);
                    if (!"income".equals(dto.getType()) && !"expense".equals(dto.getType())) {
                        throw new IllegalArgumentException("类型须为 income 或 expense");
                    }
                    FinanceTransactionVO created = createTransaction(dto);
                    approveTransaction(created.getId(), "approved", "导入自动审批");
                    success++;
                } catch (Exception ex) {
                    failed++;
                    errors.add("第" + rowNum + "行: " + ex.getMessage());
                }
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "文件解析失败: " + e.getMessage());
        }
        recalculateAllBudgets();
        Map<String, Object> result = new HashMap<>();
        result.put("success", success);
        result.put("failed", failed);
        result.put("errors", errors);
        return result;
    }

    @Override
    public void exportTransactions(String keyword, String type, String category, String startDate,
                                   String endDate, String approvalStatus, String invoiceStatus,
                                   String format, HttpServletResponse response) {
        // 导出不分页截断：按同一筛选条件全量查出
        LambdaQueryWrapper<FinanceTransaction> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(type != null && !type.isBlank(), FinanceTransaction::getType, type)
                .eq(category != null && !category.isBlank(), FinanceTransaction::getCategory, category)
                .eq(approvalStatus != null && !approvalStatus.isBlank(), FinanceTransaction::getApprovalStatus, approvalStatus)
                .eq(invoiceStatus != null && !invoiceStatus.isBlank(), FinanceTransaction::getInvoiceStatus, invoiceStatus)
                .ge(startDate != null && !startDate.isBlank(), FinanceTransaction::getTransactionDate, startDate)
                .le(endDate != null && !endDate.isBlank(), FinanceTransaction::getTransactionDate, endDate)
                .and(keyword != null && !keyword.isBlank(), w -> w
                        .like(FinanceTransaction::getDescription, keyword)
                        .or().like(FinanceTransaction::getCounterparty, keyword)
                        .or().like(FinanceTransaction::getCategory, keyword))
                .orderByDesc(FinanceTransaction::getTransactionDate)
                .orderByDesc(FinanceTransaction::getId);
        List<FinanceTransactionVO> records = transactionMapper.selectList(wrapper).stream()
                .map(this::toTransactionVO)
                .toList();
        boolean xlsx = "xlsx".equalsIgnoreCase(format) || "excel".equalsIgnoreCase(format);
        try {
            if (xlsx) {
                List<List<Object>> rows = new ArrayList<>();
                for (FinanceTransactionVO item : records) {
                    // Arrays.asList 允许 null，避免 List.of 因空字段 NPE
                    rows.add(Arrays.asList(
                            item.getType(), item.getAmount(), item.getCategory(), item.getSubCategory(),
                            item.getDescription(), item.getTransactionDate(), item.getPaymentMethod(),
                            item.getCounterparty(), item.getApprovalStatus(), item.getInvoiceStatus()));
                }
                ExcelExportHelper.writeSheet(response, "finance-transactions", "收支明细",
                        List.of("类型", "金额", "分类", "子分类", "说明", "交易日期", "支付方式", "对方", "审批状态", "发票状态"),
                        rows);
                return;
            }
            response.setContentType("text/csv;charset=UTF-8");
            response.setHeader("Content-Disposition", "attachment; filename=finance-transactions.csv");
            response.getOutputStream().write(new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF});
            PrintWriter writer = new PrintWriter(response.getOutputStream(), true, java.nio.charset.StandardCharsets.UTF_8);
            writer.println("type,amount,category,subCategory,description,transactionDate,paymentMethod,counterparty,approvalStatus,invoiceStatus");
            for (FinanceTransactionVO item : records) {
                writer.printf(Locale.ROOT, "%s,%s,%s,%s,%s,%s,%s,%s,%s,%s%n",
                        csv(item.getType()),
                        csv(item.getAmount()),
                        csv(item.getCategory()),
                        csv(item.getSubCategory()),
                        csv(item.getDescription()),
                        csv(item.getTransactionDate()),
                        csv(item.getPaymentMethod()),
                        csv(item.getCounterparty()),
                        csv(item.getApprovalStatus()),
                        csv(item.getInvoiceStatus()));
            }
            writer.flush();
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.DATA_SAVE_FAILED, "导出失败");
        }
    }

    @Override
    public List<Map<String, Object>> getTransactionCategories(String type) {
        List<Map<String, Object>> list = new ArrayList<>();
        if (type == null || "income".equals(type)) {
            list.add(buildCategory(1L, "商品销售", "income", null));
            list.add(buildCategory(11L, "实物商品", "income", 1L));
            list.add(buildCategory(12L, "虚拟商品", "income", 1L));
            list.add(buildCategory(2L, "服务收入", "income", null));
            list.add(buildCategory(21L, "咨询服务", "income", 2L));
            list.add(buildCategory(22L, "上门服务", "income", 2L));
            list.add(buildCategory(3L, "会员充值", "income", null));
            list.add(buildCategory(31L, "余额充值", "income", 3L));
            list.add(buildCategory(32L, "会员卡", "income", 3L));
            list.add(buildCategory(4L, "广告收入", "income", null));
            list.add(buildCategory(41L, "品牌广告", "income", 4L));
            list.add(buildCategory(42L, "效果广告", "income", 4L));
            list.add(buildCategory(5L, "其他收入", "income", null));
            list.add(buildCategory(51L, "杂项收入", "income", 5L));
        }
        if (type == null || "expense".equals(type)) {
            list.add(buildCategory(6L, "人力成本", "expense", null));
            list.add(buildCategory(61L, "工资社保", "expense", 6L));
            list.add(buildCategory(62L, "外包劳务", "expense", 6L));
            list.add(buildCategory(7L, "运营费用", "expense", null));
            list.add(buildCategory(71L, "房租物业", "expense", 7L));
            list.add(buildCategory(72L, "水电通讯", "expense", 7L));
            list.add(buildCategory(8L, "采购成本", "expense", null));
            list.add(buildCategory(81L, "原材料", "expense", 8L));
            list.add(buildCategory(82L, "库存商品", "expense", 8L));
            list.add(buildCategory(9L, "营销推广", "expense", null));
            list.add(buildCategory(91L, "线上投放", "expense", 9L));
            list.add(buildCategory(92L, "线下活动", "expense", 9L));
            list.add(buildCategory(10L, "其他支出", "expense", null));
            list.add(buildCategory(101L, "杂项支出", "expense", 10L));
        }
        return list;
    }

    // ==================== 预算管理 ====================

    @Override
    public PageResult<FinanceBudgetVO> listBudgets(Integer page, Integer pageSize, String status, String keyword) {
        LambdaQueryWrapper<FinanceBudget> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(status != null && !status.isBlank(), FinanceBudget::getStatus, status)
                .and(keyword != null && !keyword.isBlank(), w -> w
                        .like(FinanceBudget::getName, keyword)
                        .or().like(FinanceBudget::getPeriod, keyword))
                .orderByDesc(FinanceBudget::getCreateTime);

        int p = page != null ? page : 1;
        int s = pageSize != null ? pageSize : 20;
        Page<FinanceBudget> result = budgetMapper.selectPage(new Page<>(p, s), wrapper);
        List<FinanceBudgetVO> records = result.getRecords().stream().map(this::toBudgetVO).toList();
        return new PageResult<>(records, result.getTotal(), result.getCurrent(), result.getSize());
    }

    @Override
    public FinanceBudgetVO getBudget(Long id) {
        return toBudgetVO(getBudgetEntity(id));
    }

    @Override
    public FinanceBudgetVO createBudget(FinanceBudgetDTO dto) {
        FinanceBudget entity = new FinanceBudget();
        BeanUtils.copyProperties(dto, entity);
        entity.setStartDate(LocalDate.parse(dto.getStartDate(), DATE_FORMATTER));
        entity.setEndDate(LocalDate.parse(dto.getEndDate(), DATE_FORMATTER));
        entity.setUsedAmount(BigDecimal.ZERO);
        entity.setRemainingAmount(dto.getTotalBudget());
        entity.setUsageRate(BigDecimal.ZERO);
        entity.setStatus("draft");
        entity.setCreatedBy("admin");
        entity.setCreateTime(LocalDateTime.now());
        entity.setUpdateTime(LocalDateTime.now());
        if (dto.getDepartments() != null) {
            entity.setDepartments(String.join(",", dto.getDepartments()));
        }
        entity.setItems(serializeBudgetItems(dto.getItems()));
        budgetMapper.insert(entity);
        recalculateBudget(entity);
        return toBudgetVO(entity);
    }

    @Override
    public FinanceBudgetVO updateBudget(Long id, FinanceBudgetDTO dto) {
        FinanceBudget entity = getBudgetEntity(id);
        BeanUtils.copyProperties(dto, entity);
        entity.setId(id);
        entity.setStartDate(LocalDate.parse(dto.getStartDate(), DATE_FORMATTER));
        entity.setEndDate(LocalDate.parse(dto.getEndDate(), DATE_FORMATTER));
        entity.setUpdateTime(LocalDateTime.now());
        if (dto.getDepartments() != null) {
            entity.setDepartments(String.join(",", dto.getDepartments()));
        }
        entity.setItems(serializeBudgetItems(dto.getItems()));
        budgetMapper.updateById(entity);
        recalculateBudget(entity);
        return toBudgetVO(entity);
    }

    @Override
    @Transactional
    public void deleteBudget(Long id) {
        budgetMapper.deleteById(id);
        budgetAlertMapper.delete(new LambdaQueryWrapper<FinanceBudgetAlert>()
                .eq(FinanceBudgetAlert::getBudgetId, id));
    }

    @Override
    @Transactional
    public FinanceBudgetVO activateBudget(Long id) {
        FinanceBudget entity = getBudgetEntity(id);
        if ("completed".equals(entity.getStatus())) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "已完成的预算无法启用");
        }
        entity.setStatus("active");
        entity.setUpdateTime(LocalDateTime.now());
        budgetMapper.updateById(entity);
        recalculateBudget(entity);
        return toBudgetVO(budgetMapper.selectById(id));
    }

    @Override
    public List<Map<String, Object>> getBudgetAlerts(Boolean handled) {
        LambdaQueryWrapper<FinanceBudgetAlert> wrapper = new LambdaQueryWrapper<>();
        if (handled != null) {
            wrapper.eq(FinanceBudgetAlert::getHandled, handled);
        }
        wrapper.orderByDesc(FinanceBudgetAlert::getUpdateTime);
        List<Map<String, Object>> list = new ArrayList<>();
        for (FinanceBudgetAlert alertRecord : budgetAlertMapper.selectList(wrapper)) {
            FinanceBudget budget = budgetMapper.selectById(alertRecord.getBudgetId());
            if (budget == null) {
                continue;
            }
            Map<String, Object> item = findBudgetItem(budget.getItems(), alertRecord.getCategory());
            BigDecimal budgetAmount = item != null ? toBigDecimal(item.get("budgetAmount")) : budget.getTotalBudget();
            BigDecimal usedAmount = item != null ? toBigDecimal(item.get("usedAmount")) : safeAmount(budget.getUsedAmount());
            BigDecimal usageRate = budgetAmount.compareTo(BigDecimal.ZERO) == 0
                    ? BigDecimal.ZERO
                    : usedAmount.multiply(new BigDecimal("100")).divide(budgetAmount, 1, RoundingMode.HALF_UP);
            Map<String, Object> alert = new HashMap<>();
            alert.put("id", alertRecord.getId());
            alert.put("budgetId", budget.getId());
            alert.put("budgetName", budget.getName());
            alert.put("category", alertRecord.getCategory());
            alert.put("budgetAmount", budgetAmount);
            alert.put("usedAmount", usedAmount);
            alert.put("usageRate", usageRate);
            alert.put("alertThreshold", item != null ? toBigDecimal(item.get("alertThreshold")).intValue() : 80);
            alert.put("alertTime", alertRecord.getUpdateTime() != null
                    ? alertRecord.getUpdateTime().format(DATE_TIME_FORMATTER)
                    : LocalDateTime.now().format(DATE_TIME_FORMATTER));
            alert.put("level", alertRecord.getAlertLevel());
            alert.put("handled", Boolean.TRUE.equals(alertRecord.getHandled()));
            list.add(alert);
        }
        return list;
    }

    @Override
    @Transactional
    public void handleBudgetAlert(Long id, String note) {
        FinanceBudgetAlert alert = budgetAlertMapper.selectById(id);
        if (alert == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
        }
        alert.setHandled(true);
        alert.setHandleNote(note);
        alert.setHandledAt(LocalDateTime.now());
        alert.setUpdateTime(LocalDateTime.now());
        budgetAlertMapper.updateById(alert);
    }

    // ==================== 发票管理 ====================

    @Override
    public PageResult<FinanceInvoiceVO> listInvoices(Integer page, Integer pageSize, String keyword,
                                                      String invoiceType, String invoiceStatus,
                                                      String startDate, String endDate) {
        LambdaQueryWrapper<FinanceInvoice> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(invoiceType != null && !invoiceType.isBlank(), FinanceInvoice::getInvoiceType, invoiceType)
                .eq(invoiceStatus != null && !invoiceStatus.isBlank(), FinanceInvoice::getInvoiceStatus, invoiceStatus)
                .ge(startDate != null && !startDate.isBlank(), FinanceInvoice::getIssueDate, startDate)
                .le(endDate != null && !endDate.isBlank(), FinanceInvoice::getIssueDate, endDate)
                .and(keyword != null && !keyword.isBlank(), w -> w
                        .like(FinanceInvoice::getInvoiceNumber, keyword)
                        .or().like(FinanceInvoice::getIssuer, keyword)
                        .or().like(FinanceInvoice::getReceiver, keyword)
                        .or().like(FinanceInvoice::getDescription, keyword))
                .orderByDesc(FinanceInvoice::getCreateTime);

        int p = page != null ? page : 1;
        int s = pageSize != null ? pageSize : 20;
        Page<FinanceInvoice> result = invoiceMapper.selectPage(new Page<>(p, s), wrapper);
        List<FinanceInvoiceVO> records = result.getRecords().stream().map(this::toInvoiceVO).toList();
        return new PageResult<>(records, result.getTotal(), result.getCurrent(), result.getSize());
    }

    @Override
    public FinanceInvoiceVO getInvoice(Long id) {
        return toInvoiceVO(getInvoiceEntity(id));
    }

    @Override
    public FinanceInvoiceVO createInvoice(FinanceInvoiceDTO dto) {
        FinanceInvoice entity = new FinanceInvoice();
        applyInvoiceDto(entity, dto);
        entity.setInvoiceStatus("draft");
        entity.setCreatedBy("admin");
        entity.setCreateTime(LocalDateTime.now());
        entity.setUpdateTime(LocalDateTime.now());
        invoiceMapper.insert(entity);
        return toInvoiceVO(entity);
    }

    @Override
    public FinanceInvoiceVO updateInvoice(Long id, FinanceInvoiceDTO dto) {
        FinanceInvoice entity = getInvoiceEntity(id);
        if (!"draft".equals(entity.getInvoiceStatus())) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "仅草稿发票可编辑");
        }
        applyInvoiceDto(entity, dto);
        entity.setId(id);
        // 保持 draft，不覆盖状态
        entity.setInvoiceStatus("draft");
        entity.setUpdateTime(LocalDateTime.now());
        invoiceMapper.updateById(entity);
        return toInvoiceVO(entity);
    }

    @Override
    public void deleteInvoice(Long id) {
        FinanceInvoice entity = getInvoiceEntity(id);
        if (!"draft".equals(entity.getInvoiceStatus())) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "仅草稿发票可删除");
        }
        invoiceMapper.deleteById(id);
    }

    @Override
    public void issueInvoice(Long id) {
        FinanceInvoice entity = getInvoiceEntity(id);
        if (!"draft".equals(entity.getInvoiceStatus())) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "仅草稿发票可开具");
        }
        entity.setInvoiceStatus("issued");
        entity.setUpdateTime(LocalDateTime.now());
        invoiceMapper.updateById(entity);
    }

    @Override
    public void verifyInvoice(Long id) {
        FinanceInvoice entity = getInvoiceEntity(id);
        String status = entity.getInvoiceStatus();
        if (!"pending".equals(status) && !"issued".equals(status)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "仅待处理/已开具发票可核验");
        }
        entity.setInvoiceStatus("verified");
        entity.setUpdateTime(LocalDateTime.now());
        invoiceMapper.updateById(entity);
    }

    @Override
    public void cancelInvoice(Long id, String reason) {
        FinanceInvoice entity = getInvoiceEntity(id);
        if ("cancelled".equals(entity.getInvoiceStatus())) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "发票已作废");
        }
        if ("draft".equals(entity.getInvoiceStatus())) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "草稿请直接删除，无需作废");
        }
        entity.setInvoiceStatus("cancelled");
        entity.setCancelReason(reason);
        entity.setUpdateTime(LocalDateTime.now());
        invoiceMapper.updateById(entity);
    }

    @Override
    public Map<String, Object> calculateTax(BigDecimal amount, BigDecimal taxRate, String type, Boolean includeTax) {
        BigDecimal safeAmount = amount != null ? amount : BigDecimal.ZERO;
        BigDecimal rate = taxRate != null ? taxRate : BigDecimal.ZERO;
        BigDecimal rateFactor = rate.divide(new BigDecimal("100"), 8, RoundingMode.HALF_UP);
        boolean withTax = Boolean.TRUE.equals(includeTax);

        BigDecimal exclusive;
        BigDecimal vatAmount;
        BigDecimal gross;
        if (withTax) {
            // 含税价拆分
            gross = safeAmount;
            exclusive = rate.compareTo(BigDecimal.ZERO) == 0
                    ? gross
                    : gross.divide(BigDecimal.ONE.add(rateFactor), 2, RoundingMode.HALF_UP);
            vatAmount = gross.subtract(exclusive);
        } else {
            exclusive = safeAmount;
            vatAmount = exclusive.multiply(rateFactor).setScale(2, RoundingMode.HALF_UP);
            gross = exclusive.add(vatAmount);
        }

        BigDecimal surcharge = vatAmount.multiply(new BigDecimal("0.12")).setScale(2, RoundingMode.HALF_UP);
        // 企业所得税为示意口径：不含税收入 × 25%
        BigDecimal incomeTax = exclusive.multiply(new BigDecimal("0.25")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalTax = vatAmount.add(surcharge).add(incomeTax);
        BigDecimal afterTaxIncome = exclusive.subtract(surcharge).subtract(incomeTax);

        Map<String, Object> result = new HashMap<>();
        result.put("type", type);
        result.put("includeTax", withTax);
        result.put("grossAmount", gross);
        result.put("taxableIncome", exclusive);
        result.put("vatAmount", vatAmount);
        result.put("surcharge", surcharge);
        result.put("incomeTax", incomeTax);
        result.put("totalTax", totalTax);
        result.put("afterTaxIncome", afterTaxIncome);
        return result;
    }

    @Override
    public Map<String, Object> getInvoiceTaxSummary() {
        LocalDate now = LocalDate.now();
        LocalDate monthStart = now.withDayOfMonth(1);
        List<FinanceInvoice> invoices = invoiceMapper.selectList(new LambdaQueryWrapper<FinanceInvoice>()
                .ge(FinanceInvoice::getIssueDate, monthStart)
                .le(FinanceInvoice::getIssueDate, now));

        BigDecimal totalInvoiced = BigDecimal.ZERO;
        BigDecimal totalPaid = BigDecimal.ZERO;
        BigDecimal totalPending = BigDecimal.ZERO;
        for (FinanceInvoice inv : invoices) {
            String status = inv.getInvoiceStatus();
            if ("draft".equals(status) || "cancelled".equals(status)) {
                continue;
            }
            totalInvoiced = totalInvoiced.add(safeAmount(inv.getTotalAmount()));
            BigDecimal tax = safeAmount(inv.getTaxAmount());
            if ("verified".equals(status) || "received".equals(status)) {
                totalPaid = totalPaid.add(tax);
            } else if ("pending".equals(status) || "issued".equals(status)) {
                totalPending = totalPending.add(tax);
            }
        }

        Map<String, Object> data = new HashMap<>();
        data.put("totalInvoiced", totalInvoiced);
        data.put("totalPaid", totalPaid);
        data.put("totalPending", totalPending);
        data.put("month", monthStart.format(DateTimeFormatter.ofPattern("yyyy-MM")));
        return data;
    }

    private void applyInvoiceDto(FinanceInvoice entity, FinanceInvoiceDTO dto) {
        entity.setInvoiceNumber(dto.getInvoiceNumber());
        entity.setInvoiceType(dto.getInvoiceType());
        entity.setAmount(dto.getAmount());
        entity.setTaxRate(dto.getTaxRate());
        entity.setIssuer(dto.getIssuer());
        entity.setReceiver(dto.getReceiver());
        entity.setIssueDate(LocalDate.parse(dto.getIssueDate(), DATE_FORMATTER));
        entity.setDueDate(LocalDate.parse(dto.getDueDate(), DATE_FORMATTER));
        entity.setTransactionId(dto.getTransactionId());
        entity.setDescription(dto.getDescription());
        BigDecimal taxAmount = dto.getAmount().multiply(dto.getTaxRate())
                .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        entity.setTaxAmount(taxAmount);
        entity.setTotalAmount(dto.getAmount().add(taxAmount));
    }

    // ==================== 财务权限 ====================

    @Override
    public List<FinanceRoleVO> getRoles() {
        List<FinanceRole> roles = financeRoleMapper.selectList(new LambdaQueryWrapper<FinanceRole>()
                .orderByAsc(FinanceRole::getId));
        return roles.stream().map(this::toRoleVO).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public FinanceRoleVO createRole(FinanceRoleDTO dto) {
        FinanceRole entity = new FinanceRole();
        entity.setName(dto.getName());
        entity.setLevel(dto.getLevel());
        entity.setDescription(dto.getDescription());
        entity.setPermissions(serializePermissions(dto.getPermissions()));
        entity.setCreateTime(LocalDateTime.now());
        entity.setUpdateTime(LocalDateTime.now());
        financeRoleMapper.insert(entity);
        return toRoleVO(entity);
    }

    @Override
    @Transactional
    public FinanceRoleVO updateRole(Long id, FinanceRoleDTO dto) {
        FinanceRole entity = getFinanceRoleEntity(id);
        entity.setName(dto.getName());
        entity.setLevel(dto.getLevel());
        entity.setDescription(dto.getDescription());
        entity.setPermissions(serializePermissions(dto.getPermissions()));
        entity.setUpdateTime(LocalDateTime.now());
        financeRoleMapper.updateById(entity);
        return toRoleVO(entity);
    }

    @Override
    @Transactional
    public void deleteRole(Long id) {
        Long count = financePermissionMapper.selectCount(new LambdaQueryWrapper<FinancePermission>()
                .eq(FinancePermission::getRoleId, id));
        if (count != null && count > 0) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "角色下仍有成员，无法删除");
        }
        financeRoleMapper.deleteById(id);
    }

    @Override
    public List<Map<String, Object>> getPermissions(Long roleId) {
        LambdaQueryWrapper<FinancePermission> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(roleId != null, FinancePermission::getRoleId, roleId)
                .orderByDesc(FinancePermission::getCreateTime);
        return financePermissionMapper.selectList(wrapper).stream()
                .map(this::toPermissionMap)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void assignPermission(Map<String, Object> params) {
        Long userId = toLong(params.get("userId"));
        Long roleId = toLong(params.get("roleId"));
        if (userId == null || roleId == null) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "用户和角色不能为空");
        }
        if (adminUserMapper.selectById(userId) == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND, "用户不存在");
        }
        getFinanceRoleEntity(roleId);
        Long exists = financePermissionMapper.selectCount(new LambdaQueryWrapper<FinancePermission>()
                .eq(FinancePermission::getUserId, userId));
        if (exists != null && exists > 0) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "该用户已分配财务权限");
        }
        FinancePermission entity = new FinancePermission();
        entity.setUserId(userId);
        entity.setRoleId(roleId);
        entity.setScope(serializeScope(params.get("scope")));
        entity.setDataRange(String.valueOf(params.getOrDefault("dataRange", "self")));
        entity.setCreateTime(LocalDateTime.now());
        entity.setUpdateTime(LocalDateTime.now());
        financePermissionMapper.insert(entity);
    }

    @Override
    @Transactional
    public void updatePermission(Long id, Map<String, Object> params) {
        FinancePermission entity = getFinancePermissionEntity(id);
        if (params.get("roleId") != null) {
            entity.setRoleId(toLong(params.get("roleId")));
            getFinanceRoleEntity(entity.getRoleId());
        }
        if (params.get("scope") != null) {
            entity.setScope(serializeScope(params.get("scope")));
        }
        if (params.get("dataRange") != null) {
            entity.setDataRange(String.valueOf(params.get("dataRange")));
        }
        entity.setUpdateTime(LocalDateTime.now());
        financePermissionMapper.updateById(entity);
    }

    @Override
    @Transactional
    public void removePermission(Long id) {
        financePermissionMapper.deleteById(id);
    }

    // ==================== 数据同步 ====================

    @Override
    public Map<String, Object> getSyncStatus() {
        List<FinanceSyncConfig> configs = syncConfigMapper.selectList(new LambdaQueryWrapper<>());
        FinanceSyncConfig latest = configs.stream()
                .filter(item -> item.getLastSyncTime() != null)
                .max(Comparator.comparing(FinanceSyncConfig::getLastSyncTime))
                .orElse(configs.isEmpty() ? null : configs.get(0));
        Map<String, Object> status = new HashMap<>();
        if (latest == null) {
            status.put("lastSyncTime", null);
            status.put("syncSource", "erp");
            status.put("syncStatus", "idle");
            status.put("recordCount", 0);
            status.put("syncMode", "local_recalc");
            status.put("syncHint", "当前为本地刷新：重算预算占用，未对接外部 ERP/支付入账");
            return status;
        }
        status.put("lastSyncTime", latest.getLastSyncTime() != null
                ? latest.getLastSyncTime().format(DATE_TIME_FORMATTER) : null);
        status.put("syncSource", latest.getSource());
        status.put("syncStatus", latest.getLastSyncStatus());
        status.put("recordCount", latest.getLastRecordCount());
        status.put("syncMode", "local_recalc");
        status.put("syncHint", "当前为本地刷新：重算预算占用，未对接外部 ERP/支付入账");
        return status;
    }

    @Override
    @Transactional
    public void triggerSync(String source) {
        List<FinanceSyncConfig> targets = syncConfigMapper.selectList(new LambdaQueryWrapper<FinanceSyncConfig>()
                .eq(source != null && !source.isBlank(), FinanceSyncConfig::getSource, source)
                .eq(FinanceSyncConfig::getEnabled, true));
        if (targets.isEmpty()) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "没有可同步的配置项");
        }
        for (FinanceSyncConfig config : targets) {
            int recordCount = 0;
            try {
                switch (config.getSource()) {
                    case "erp" -> {
                        recalculateAllBudgets();
                        recordCount = Math.toIntExact(Optional.ofNullable(
                                transactionMapper.selectCount(new LambdaQueryWrapper<>())).orElse(0L));
                    }
                    case "bank" -> recordCount = Math.toIntExact(Optional.ofNullable(
                            transactionMapper.selectCount(new LambdaQueryWrapper<FinanceTransaction>()
                                    .isNotNull(FinanceTransaction::getPaymentMethod))).orElse(0L));
                    case "tax" -> recordCount = Math.toIntExact(Optional.ofNullable(
                            invoiceMapper.selectCount(new LambdaQueryWrapper<>())).orElse(0L));
                    default -> recordCount = 0;
                }
                config.setLastSyncTime(LocalDateTime.now());
                config.setLastSyncStatus("success");
                config.setLastRecordCount(recordCount);
            } catch (Exception ex) {
                config.setLastSyncTime(LocalDateTime.now());
                config.setLastSyncStatus("failed");
                config.setLastRecordCount(0);
            }
            config.setUpdateTime(LocalDateTime.now());
            syncConfigMapper.updateById(config);
        }
    }

    @Override
    public List<Map<String, Object>> getSyncConfigs() {
        return syncConfigMapper.selectList(new LambdaQueryWrapper<FinanceSyncConfig>()
                        .orderByAsc(FinanceSyncConfig::getId)).stream()
                .map(this::toSyncConfigMap)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void updateSyncConfig(Long id, Map<String, Object> data) {
        FinanceSyncConfig config = syncConfigMapper.selectById(id);
        if (config == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
        }
        if (data.get("enabled") != null) {
            config.setEnabled(Boolean.parseBoolean(String.valueOf(data.get("enabled"))));
        }
        if (data.get("syncInterval") != null) {
            config.setSyncInterval(Integer.parseInt(String.valueOf(data.get("syncInterval"))));
        }
        if (data.get("autoSync") != null) {
            config.setAutoSync(Boolean.parseBoolean(String.valueOf(data.get("autoSync"))));
        }
        config.setUpdateTime(LocalDateTime.now());
        syncConfigMapper.updateById(config);
    }

    // ==================== 财务报表 ====================

    @Override
    public Map<String, Object> getProfitLossReport(String startDate, String endDate) {
        LocalDate start = parseDate(startDate);
        LocalDate end = parseDate(endDate);
        BigDecimal revenue = sumTransactionAmount("income", start, end);
        BigDecimal totalExpense = sumTransactionAmount("expense", start, end);
        BigDecimal costOfGoods = sumExpenseByCategory(COST_OF_GOODS_CATEGORY, start, end);
        BigDecimal otherExpense = sumExpenseByCategory("其他支出", start, end);
        BigDecimal otherIncome = sumIncomeByCategory("其他收入", start, end);
        BigDecimal operatingExpenses = totalExpense.subtract(costOfGoods).subtract(otherExpense).max(BigDecimal.ZERO);
        BigDecimal mainRevenue = revenue.subtract(otherIncome).max(BigDecimal.ZERO);
        BigDecimal grossProfit = mainRevenue.subtract(costOfGoods);
        BigDecimal operatingIncome = mainRevenue.subtract(costOfGoods).subtract(operatingExpenses);
        BigDecimal profitBeforeTax = operatingIncome.add(otherIncome).subtract(otherExpense);
        // 不虚构所得税
        BigDecimal incomeTax = BigDecimal.ZERO;
        BigDecimal netProfit = profitBeforeTax.subtract(incomeTax);

        Map<String, Object> data = new HashMap<>();
        data.put("revenue", mainRevenue);
        data.put("costOfGoods", costOfGoods);
        data.put("grossProfit", grossProfit);
        data.put("operatingExpenses", operatingExpenses);
        data.put("operatingIncome", operatingIncome);
        data.put("otherIncome", otherIncome);
        data.put("otherExpense", otherExpense);
        data.put("profitBeforeTax", profitBeforeTax);
        data.put("incomeTax", incomeTax);
        data.put("netProfit", netProfit);
        return data;
    }

    @Override
    public Map<String, Object> getCashFlowReport(String startDate, String endDate) {
        LocalDate start = parseDate(startDate);
        LocalDate end = parseDate(endDate);
        BigDecimal operatingInflow = sumTransactionAmount("income", start, end);
        BigDecimal operatingOutflow = sumTransactionAmount("expense", start, end);
        BigDecimal operatingNet = operatingInflow.subtract(operatingOutflow);

        LocalDate dayBefore = start.minusDays(1);
        BigDecimal beginningBalance = sumTransactionAmount("income", null, dayBefore)
                .subtract(sumTransactionAmount("expense", null, dayBefore));
        BigDecimal endingBalance = beginningBalance.add(operatingNet);

        Map<String, Object> data = new HashMap<>();
        data.put("operatingInflow", operatingInflow);
        data.put("operatingOutflow", operatingOutflow);
        data.put("operatingNet", operatingNet);
        data.put("investingInflow", BigDecimal.ZERO);
        data.put("investingOutflow", BigDecimal.ZERO);
        data.put("investingNet", BigDecimal.ZERO);
        data.put("financingInflow", BigDecimal.ZERO);
        data.put("financingOutflow", BigDecimal.ZERO);
        data.put("financingNet", BigDecimal.ZERO);
        data.put("totalNetCashFlow", operatingNet);
        data.put("beginningBalance", beginningBalance);
        data.put("endingBalance", endingBalance);
        return data;
    }

    @Override
    public List<Map<String, Object>> getCategoryAnalysisReport(String startDate, String endDate) {
        LocalDate start = parseDate(startDate);
        LocalDate end = parseDate(endDate);
        long days = Math.max(1, java.time.temporal.ChronoUnit.DAYS.between(start, end) + 1);
        LocalDate prevEnd = start.minusDays(1);
        LocalDate prevStart = prevEnd.minusDays(days - 1);

        List<FinanceCategorySummaryVO> currentIncome = buildCategorySummary("income", start, end);
        List<FinanceCategorySummaryVO> currentExpense = buildCategorySummary("expense", start, end);
        Map<String, BigDecimal> prevIncome = categoryAmountMap("income", prevStart, prevEnd);
        Map<String, BigDecimal> prevExpense = categoryAmountMap("expense", prevStart, prevEnd);

        List<Map<String, Object>> list = new ArrayList<>();
        appendCategoryAnalysisRows(list, "income", currentIncome, prevIncome);
        appendCategoryAnalysisRows(list, "expense", currentExpense, prevExpense);
        return list;
    }

    @Override
    public void exportReport(String startDate, String endDate, String format, HttpServletResponse response) {
        Map<String, Object> profitLoss = getProfitLossReport(startDate, endDate);
        Map<String, Object> cashFlow = getCashFlowReport(startDate, endDate);
        List<Map<String, Object>> categoryAnalysis = getCategoryAnalysisReport(startDate, endDate);
        boolean xlsx = "xlsx".equalsIgnoreCase(format) || "excel".equalsIgnoreCase(format);
        try {
            if (xlsx) {
                List<List<Object>> rows = new ArrayList<>();
                rows.add(Arrays.asList("【利润表】", "", ""));
                rows.add(Arrays.asList("营业收入", profitLoss.get("revenue"), ""));
                rows.add(Arrays.asList("营业成本", profitLoss.get("costOfGoods"), ""));
                rows.add(Arrays.asList("毛利润", profitLoss.get("grossProfit"), ""));
                rows.add(Arrays.asList("运营费用", profitLoss.get("operatingExpenses"), ""));
                rows.add(Arrays.asList("营业利润", profitLoss.get("operatingIncome"), ""));
                rows.add(Arrays.asList("其他收入", profitLoss.get("otherIncome"), ""));
                rows.add(Arrays.asList("其他支出", profitLoss.get("otherExpense"), ""));
                rows.add(Arrays.asList("税前利润", profitLoss.get("profitBeforeTax"), ""));
                rows.add(Arrays.asList("所得税", profitLoss.get("incomeTax"), ""));
                rows.add(Arrays.asList("净利润", profitLoss.get("netProfit"), ""));
                rows.add(Arrays.asList("", "", ""));
                rows.add(Arrays.asList("【现金流量表】", "", ""));
                rows.add(Arrays.asList("经营活动流入", cashFlow.get("operatingInflow"), ""));
                rows.add(Arrays.asList("经营活动流出", cashFlow.get("operatingOutflow"), ""));
                rows.add(Arrays.asList("经营活动净额", cashFlow.get("operatingNet"), ""));
                rows.add(Arrays.asList("期初余额", cashFlow.get("beginningBalance"), ""));
                rows.add(Arrays.asList("现金净增加额", cashFlow.get("totalNetCashFlow"), ""));
                rows.add(Arrays.asList("期末余额", cashFlow.get("endingBalance"), ""));
                rows.add(Arrays.asList("", "", ""));
                rows.add(Arrays.asList("【分类分析】", "本期金额", "占比(%)"));
                for (Map<String, Object> row : categoryAnalysis) {
                    rows.add(Arrays.asList(row.get("category"), row.get("currentAmount"), row.get("percentage")));
                }
                ExcelExportHelper.writeSheet(response, "finance-report-" + startDate + "-" + endDate,
                        "财务报表", List.of("项目", "金额", "备注"), rows);
                return;
            }
            response.setContentType("text/csv;charset=UTF-8");
            response.setHeader("Content-Disposition",
                    "attachment; filename=finance-report-" + startDate + "-" + endDate + ".csv");
            response.getOutputStream().write(new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF});
            PrintWriter writer = new PrintWriter(response.getOutputStream(), true, java.nio.charset.StandardCharsets.UTF_8);
            writer.printf(Locale.ROOT, "财务报表,开始日期,%s,结束日期,%s%n%n", startDate, endDate);

            writer.println("【利润表】");
            writer.println("项目,金额");
            writer.printf(Locale.ROOT, "营业收入,%s%n", csv(profitLoss.get("revenue")));
            writer.printf(Locale.ROOT, "营业成本,%s%n", csv(profitLoss.get("costOfGoods")));
            writer.printf(Locale.ROOT, "毛利润,%s%n", csv(profitLoss.get("grossProfit")));
            writer.printf(Locale.ROOT, "运营费用,%s%n", csv(profitLoss.get("operatingExpenses")));
            writer.printf(Locale.ROOT, "营业利润,%s%n", csv(profitLoss.get("operatingIncome")));
            writer.printf(Locale.ROOT, "其他收入,%s%n", csv(profitLoss.get("otherIncome")));
            writer.printf(Locale.ROOT, "其他支出,%s%n", csv(profitLoss.get("otherExpense")));
            writer.printf(Locale.ROOT, "税前利润,%s%n", csv(profitLoss.get("profitBeforeTax")));
            writer.printf(Locale.ROOT, "所得税,%s%n", csv(profitLoss.get("incomeTax")));
            writer.printf(Locale.ROOT, "净利润,%s%n%n", csv(profitLoss.get("netProfit")));

            writer.println("【现金流量表】");
            writer.println("项目,金额");
            writer.printf(Locale.ROOT, "经营活动流入,%s%n", csv(cashFlow.get("operatingInflow")));
            writer.printf(Locale.ROOT, "经营活动流出,%s%n", csv(cashFlow.get("operatingOutflow")));
            writer.printf(Locale.ROOT, "经营活动净额,%s%n", csv(cashFlow.get("operatingNet")));
            writer.printf(Locale.ROOT, "期初余额,%s%n", csv(cashFlow.get("beginningBalance")));
            writer.printf(Locale.ROOT, "现金净增加额,%s%n", csv(cashFlow.get("totalNetCashFlow")));
            writer.printf(Locale.ROOT, "期末余额,%s%n%n", csv(cashFlow.get("endingBalance")));

            writer.println("【分类分析】");
            writer.println("分类,本期金额,上期金额,变动率,占比(%)");
            for (Map<String, Object> row : categoryAnalysis) {
                writer.printf(Locale.ROOT, "%s,%s,%s,%s,%s%n",
                        csv(row.get("category")),
                        csv(row.get("currentAmount")),
                        csv(row.get("previousAmount")),
                        csv(row.get("changeRate")),
                        csv(row.get("percentage")));
            }
            writer.flush();
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.DATA_SAVE_FAILED, "报表导出失败");
        }
    }

    // ==================== 私有方法 ====================

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return LocalDate.parse(value, DATE_FORMATTER);
    }

    private BigDecimal safeAmount(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private BigDecimal sumTransactionAmount(String type, LocalDate start, LocalDate end) {
        LambdaQueryWrapper<FinanceTransaction> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FinanceTransaction::getType, type)
                .eq(FinanceTransaction::getApprovalStatus, "approved");
        if (start != null) {
            wrapper.ge(FinanceTransaction::getTransactionDate, start);
        }
        if (end != null) {
            wrapper.le(FinanceTransaction::getTransactionDate, end);
        }
        return transactionMapper.selectList(wrapper).stream()
                .map(FinanceTransaction::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private List<FinanceTransaction> listTransactionsBetween(LocalDate start, LocalDate end) {
        LambdaQueryWrapper<FinanceTransaction> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FinanceTransaction::getApprovalStatus, "approved")
                .ge(FinanceTransaction::getTransactionDate, start)
                .le(FinanceTransaction::getTransactionDate, end);
        return transactionMapper.selectList(wrapper);
    }

    private BigDecimal calculateChangeRate(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.compareTo(BigDecimal.ZERO) == 0) {
            // 基数为 0 时环比无意义，返回 null，前端显示 "—"
            return null;
        }
        if (current == null) return BigDecimal.ZERO;
        return current.subtract(previous)
                .multiply(new BigDecimal("100"))
                .divide(previous, 1, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateAverageBudgetUsageRate() {
        List<FinanceBudget> budgets = budgetMapper.selectList(new LambdaQueryWrapper<FinanceBudget>()
                .eq(FinanceBudget::getStatus, "active"));
        if (budgets.isEmpty()) {
            return BigDecimal.ZERO;
        }
        BigDecimal total = budgets.stream()
                .map(FinanceBudget::getUsageRate)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return total.divide(BigDecimal.valueOf(budgets.size()), 1, RoundingMode.HALF_UP);
    }

    private FinanceTrendVO emptyTrend(String date) {
        FinanceTrendVO trend = new FinanceTrendVO();
        trend.setDate(date);
        trend.setIncome(BigDecimal.ZERO);
        trend.setExpense(BigDecimal.ZERO);
        trend.setProfit(BigDecimal.ZERO);
        return trend;
    }

    private void applyTransactionToTrend(FinanceTrendVO trend, FinanceTransaction transaction) {
        if ("income".equals(transaction.getType())) {
            trend.setIncome(safeAmount(trend.getIncome()).add(safeAmount(transaction.getAmount())));
        } else if ("expense".equals(transaction.getType())) {
            trend.setExpense(safeAmount(trend.getExpense()).add(safeAmount(transaction.getAmount())));
        }
    }

    private List<FinanceCategorySummaryVO> buildCategorySummary(String type, LocalDate start, LocalDate end) {
        LambdaQueryWrapper<FinanceTransaction> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FinanceTransaction::getType, type)
                .eq(FinanceTransaction::getApprovalStatus, "approved");
        if (start != null) {
            wrapper.ge(FinanceTransaction::getTransactionDate, start);
        }
        if (end != null) {
            wrapper.le(FinanceTransaction::getTransactionDate, end);
        }
        Map<String, BigDecimal> grouped = transactionMapper.selectList(wrapper).stream()
                .collect(Collectors.groupingBy(
                        item -> item.getCategory() != null ? item.getCategory() : "未分类",
                        Collectors.mapping(FinanceTransaction::getAmount,
                                Collectors.reducing(BigDecimal.ZERO, amount -> amount != null ? amount : BigDecimal.ZERO, BigDecimal::add))
                ));
        BigDecimal total = grouped.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        if (grouped.isEmpty()) {
            return Collections.emptyList();
        }
        return grouped.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .map(entry -> {
                    BigDecimal percentage = total.compareTo(BigDecimal.ZERO) == 0
                            ? BigDecimal.ZERO
                            : entry.getValue().multiply(new BigDecimal("100")).divide(total, 1, RoundingMode.HALF_UP);
                    return createCategorySummary(entry.getKey(), entry.getValue(), percentage);
                })
                .collect(Collectors.toList());
    }

    private String serializeBudgetItems(Object items) {
        if (items == null) {
            return null;
        }
        if (items instanceof String text) {
            return text;
        }
        try {
            return objectMapper.writeValueAsString(items);
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "预算科目格式不正确");
        }
    }

    private Object parseBudgetItems(String items) {
        if (items == null || items.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(items, List.class);
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private FinanceTransaction getTransactionEntity(Long id) {
        FinanceTransaction entity = transactionMapper.selectById(id);
        if (entity == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
        }
        return entity;
    }

    private FinanceBudget getBudgetEntity(Long id) {
        FinanceBudget entity = budgetMapper.selectById(id);
        if (entity == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
        }
        return entity;
    }

    private FinanceInvoice getInvoiceEntity(Long id) {
        FinanceInvoice entity = invoiceMapper.selectById(id);
        if (entity == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
        }
        return entity;
    }

    private FinanceTransactionVO toTransactionVO(FinanceTransaction entity) {
        FinanceTransactionVO vo = new FinanceTransactionVO();
        vo.setId(entity.getId());
        vo.setType(entity.getType());
        vo.setAmount(entity.getAmount());
        vo.setCategory(entity.getCategory());
        vo.setSubCategory(entity.getSubCategory());
        vo.setDescription(entity.getDescription());
        vo.setTransactionDate(entity.getTransactionDate() != null ? entity.getTransactionDate().format(DATE_FORMATTER) : null);
        vo.setPaymentMethod(entity.getPaymentMethod());
        vo.setCounterparty(entity.getCounterparty());
        vo.setInvoiceStatus(entity.getInvoiceStatus());
        vo.setApprovalStatus(entity.getApprovalStatus());
        vo.setCreatedBy(entity.getCreatedBy());
        vo.setCreatedAt(entity.getCreateTime() != null ? entity.getCreateTime().format(DATE_TIME_FORMATTER) : null);
        vo.setUpdatedAt(entity.getUpdateTime() != null ? entity.getUpdateTime().format(DATE_TIME_FORMATTER) : null);
        return vo;
    }

    private FinanceBudgetVO toBudgetVO(FinanceBudget entity) {
        FinanceBudgetVO vo = new FinanceBudgetVO();
        vo.setId(entity.getId());
        vo.setName(entity.getName());
        vo.setPeriod(entity.getPeriod());
        vo.setStartDate(entity.getStartDate() != null ? entity.getStartDate().format(DATE_FORMATTER) : null);
        vo.setEndDate(entity.getEndDate() != null ? entity.getEndDate().format(DATE_FORMATTER) : null);
        vo.setTotalBudget(entity.getTotalBudget());
        vo.setUsedAmount(entity.getUsedAmount());
        vo.setRemainingAmount(entity.getRemainingAmount());
        vo.setUsageRate(entity.getUsageRate());
        vo.setStatus(entity.getStatus());
        vo.setItems(parseBudgetItems(entity.getItems()));
        vo.setCreatedBy(entity.getCreatedBy());
        vo.setCreatedAt(entity.getCreateTime() != null ? entity.getCreateTime().format(DATE_TIME_FORMATTER) : null);
        vo.setUpdatedAt(entity.getUpdateTime() != null ? entity.getUpdateTime().format(DATE_TIME_FORMATTER) : null);
        // 处理 departments: 逗号分隔字符串 -> List<String>
        if (entity.getDepartments() != null && !entity.getDepartments().isBlank()) {
            vo.setDepartments(Arrays.asList(entity.getDepartments().split(",")));
        } else {
            vo.setDepartments(new ArrayList<>());
        }
        return vo;
    }

    private FinanceInvoiceVO toInvoiceVO(FinanceInvoice entity) {
        FinanceInvoiceVO vo = new FinanceInvoiceVO();
        vo.setId(entity.getId());
        vo.setInvoiceNumber(entity.getInvoiceNumber());
        vo.setInvoiceType(entity.getInvoiceType());
        vo.setInvoiceStatus(entity.getInvoiceStatus());
        vo.setAmount(entity.getAmount());
        vo.setTaxAmount(entity.getTaxAmount());
        vo.setTotalAmount(entity.getTotalAmount());
        vo.setTaxRate(entity.getTaxRate());
        vo.setIssuer(entity.getIssuer());
        vo.setReceiver(entity.getReceiver());
        vo.setIssueDate(entity.getIssueDate() != null ? entity.getIssueDate().format(DATE_FORMATTER) : null);
        vo.setDueDate(entity.getDueDate() != null ? entity.getDueDate().format(DATE_FORMATTER) : null);
        vo.setTransactionId(entity.getTransactionId());
        vo.setDescription(entity.getDescription());
        vo.setAttachmentUrl(entity.getAttachmentUrl());
        vo.setCreatedBy(entity.getCreatedBy());
        vo.setCreatedAt(entity.getCreateTime() != null ? entity.getCreateTime().format(DATE_TIME_FORMATTER) : null);
        vo.setUpdatedAt(entity.getUpdateTime() != null ? entity.getUpdateTime().format(DATE_TIME_FORMATTER) : null);
        return vo;
    }

    private FinanceCategorySummaryVO createCategorySummary(String category, BigDecimal amount, BigDecimal percentage) {
        FinanceCategorySummaryVO vo = new FinanceCategorySummaryVO();
        vo.setCategory(category);
        vo.setAmount(amount);
        vo.setPercentage(percentage);
        return vo;
    }

    private BigDecimal sumExpenseByCategory(String category, LocalDate start, LocalDate end) {
        LambdaQueryWrapper<FinanceTransaction> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FinanceTransaction::getType, "expense")
                .eq(FinanceTransaction::getCategory, category)
                .eq(FinanceTransaction::getApprovalStatus, "approved");
        if (start != null) {
            wrapper.ge(FinanceTransaction::getTransactionDate, start);
        }
        if (end != null) {
            wrapper.le(FinanceTransaction::getTransactionDate, end);
        }
        return transactionMapper.selectList(wrapper).stream()
                .map(FinanceTransaction::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal sumApprovedExpenseByCategory(LocalDate start, LocalDate end, String category) {
        LambdaQueryWrapper<FinanceTransaction> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FinanceTransaction::getType, "expense")
                .eq(FinanceTransaction::getCategory, category)
                .eq(FinanceTransaction::getApprovalStatus, "approved")
                .ge(FinanceTransaction::getTransactionDate, start)
                .le(FinanceTransaction::getTransactionDate, end);
        return transactionMapper.selectList(wrapper).stream()
                .map(FinanceTransaction::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void recalculateAllBudgets() {
        List<FinanceBudget> budgets = budgetMapper.selectList(new LambdaQueryWrapper<>());
        for (FinanceBudget budget : budgets) {
            recalculateBudget(budget);
        }
    }

    private void recalculateBudget(FinanceBudget budget) {
        List<Map<String, Object>> items = parseBudgetItemsList(budget.getItems());
        BigDecimal totalUsed = BigDecimal.ZERO;
        for (Map<String, Object> item : items) {
            String category = String.valueOf(item.getOrDefault("category", ""));
            if (category.isBlank()) {
                continue;
            }
            BigDecimal budgetAmount = toBigDecimal(item.get("budgetAmount"));
            BigDecimal used = sumApprovedExpenseByCategory(budget.getStartDate(), budget.getEndDate(), category);
            item.put("usedAmount", used);
            item.put("remainingAmount", budgetAmount.subtract(used).max(BigDecimal.ZERO));
            BigDecimal itemRate = budgetAmount.compareTo(BigDecimal.ZERO) == 0
                    ? BigDecimal.ZERO
                    : used.multiply(new BigDecimal("100")).divide(budgetAmount, 1, RoundingMode.HALF_UP);
            int threshold = toBigDecimal(item.get("alertThreshold")).intValue();
            item.put("isAlert", itemRate.compareTo(new BigDecimal(String.valueOf(threshold))) >= 0);
            totalUsed = totalUsed.add(used);
            refreshBudgetAlertRecord(budget.getId(), category, Boolean.TRUE.equals(item.get("isAlert")), itemRate);
        }
        budget.setItems(serializeBudgetItems(items));
        budget.setUsedAmount(totalUsed);
        budget.setRemainingAmount(safeAmount(budget.getTotalBudget()).subtract(totalUsed).max(BigDecimal.ZERO));
        budget.setUsageRate(safeAmount(budget.getTotalBudget()).compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : totalUsed.multiply(new BigDecimal("100")).divide(budget.getTotalBudget(), 1, RoundingMode.HALF_UP));
        budget.setUpdateTime(LocalDateTime.now());
        budgetMapper.updateById(budget);
    }

    private void refreshBudgetAlertRecord(Long budgetId, String category, boolean isAlert, BigDecimal usageRate) {
        FinanceBudgetAlert existing = budgetAlertMapper.selectOne(new LambdaQueryWrapper<FinanceBudgetAlert>()
                .eq(FinanceBudgetAlert::getBudgetId, budgetId)
                .eq(FinanceBudgetAlert::getCategory, category));
        if (!isAlert) {
            if (existing != null && !Boolean.TRUE.equals(existing.getHandled())) {
                budgetAlertMapper.deleteById(existing.getId());
            }
            return;
        }
        if (existing == null) {
            FinanceBudgetAlert alert = new FinanceBudgetAlert();
            alert.setBudgetId(budgetId);
            alert.setCategory(category);
            alert.setAlertLevel(usageRate.compareTo(new BigDecimal("90")) >= 0 ? "danger" : "warning");
            alert.setHandled(false);
            alert.setCreateTime(LocalDateTime.now());
            alert.setUpdateTime(LocalDateTime.now());
            budgetAlertMapper.insert(alert);
            return;
        }
        existing.setAlertLevel(usageRate.compareTo(new BigDecimal("90")) >= 0 ? "danger" : "warning");
        existing.setUpdateTime(LocalDateTime.now());
        budgetAlertMapper.updateById(existing);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> parseBudgetItemsList(String items) {
        if (items == null || items.isBlank()) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(items, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private FinanceRole getFinanceRoleEntity(Long id) {
        FinanceRole entity = financeRoleMapper.selectById(id);
        if (entity == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
        }
        return entity;
    }

    private FinancePermission getFinancePermissionEntity(Long id) {
        FinancePermission entity = financePermissionMapper.selectById(id);
        if (entity == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
        }
        return entity;
    }

    private FinanceRoleVO toRoleVO(FinanceRole entity) {
        FinanceRoleVO vo = new FinanceRoleVO();
        vo.setId(entity.getId());
        vo.setName(entity.getName());
        vo.setLevel(entity.getLevel());
        vo.setDescription(entity.getDescription());
        vo.setPermissions(parsePermissions(entity.getPermissions()));
        Long count = financePermissionMapper.selectCount(new LambdaQueryWrapper<FinancePermission>()
                .eq(FinancePermission::getRoleId, entity.getId()));
        vo.setMemberCount(count != null ? count.intValue() : 0);
        vo.setCreatedAt(entity.getCreateTime() != null
                ? entity.getCreateTime().format(DATE_TIME_FORMATTER)
                : LocalDateTime.now().format(DATE_TIME_FORMATTER));
        return vo;
    }

    private Map<String, Object> toPermissionMap(FinancePermission entity) {
        AdminUser user = adminUserMapper.selectById(entity.getUserId());
        FinanceRole role = financeRoleMapper.selectById(entity.getRoleId());
        Map<String, Object> map = new HashMap<>();
        map.put("id", entity.getId());
        map.put("userId", entity.getUserId());
        map.put("username", user != null ? user.getUsername() : "");
        map.put("realName", user != null ? user.getRealName() : "");
        Map<String, Object> roleMap = new HashMap<>();
        roleMap.put("id", role != null ? role.getId() : entity.getRoleId());
        roleMap.put("name", role != null ? role.getName() : "");
        roleMap.put("level", role != null ? role.getLevel() : "");
        map.put("role", roleMap);
        map.put("scope", parseScope(entity.getScope()));
        map.put("dataRange", entity.getDataRange());
        map.put("createdAt", entity.getCreateTime() != null ? entity.getCreateTime().format(DATE_TIME_FORMATTER) : null);
        map.put("updatedAt", entity.getUpdateTime() != null ? entity.getUpdateTime().format(DATE_TIME_FORMATTER) : null);
        return map;
    }

    private Map<String, Object> toSyncConfigMap(FinanceSyncConfig config) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", config.getId());
        map.put("source", config.getSource());
        map.put("sourceName", config.getSourceName());
        map.put("enabled", Boolean.TRUE.equals(config.getEnabled()));
        map.put("syncInterval", config.getSyncInterval());
        map.put("lastSyncTime", config.getLastSyncTime() != null
                ? config.getLastSyncTime().format(DATE_TIME_FORMATTER) : null);
        map.put("autoSync", Boolean.TRUE.equals(config.getAutoSync()));
        return map;
    }

    private String serializePermissions(List<String> permissions) {
        try {
            return objectMapper.writeValueAsString(permissions != null ? permissions : DEFAULT_ROLE_PERMISSIONS);
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "权限格式不正确");
        }
    }

    private List<String> parsePermissions(String permissions) {
        if (permissions == null || permissions.isBlank()) {
            return DEFAULT_ROLE_PERMISSIONS;
        }
        try {
            return objectMapper.readValue(permissions, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return DEFAULT_ROLE_PERMISSIONS;
        }
    }

    private String serializeScope(Object scope) {
        try {
            return objectMapper.writeValueAsString(scope);
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.PARAM_ERROR, "权限范围格式不正确");
        }
    }

    private List<String> parseScope(String scope) {
        if (scope == null || scope.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(scope, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(String.valueOf(value));
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        String text = String.valueOf(value);
        if (text.isBlank()) {
            return BigDecimal.ZERO;
        }
        return new BigDecimal(text);
    }

    private Map<String, Object> findBudgetItem(String itemsJson, String category) {
        for (Map<String, Object> item : parseBudgetItemsList(itemsJson)) {
            if (category.equals(String.valueOf(item.get("category")))) {
                return item;
            }
        }
        return null;
    }

    private String trendBucketKey(LocalDate date, String grain) {
        return switch (grain) {
            case "day" -> date.format(DATE_FORMATTER);
            case "week" -> weekKey(date);
            case "quarter" -> quarterKey(YearMonth.from(date));
            case "year" -> String.valueOf(date.getYear());
            default -> YearMonth.from(date).toString();
        };
    }

    private String weekKey(LocalDate date) {
        int week = date.get(java.time.temporal.WeekFields.ISO.weekOfWeekBasedYear());
        int year = date.get(java.time.temporal.WeekFields.ISO.weekBasedYear());
        return String.format(Locale.ROOT, "%d-W%02d", year, week);
    }

    private String quarterKey(YearMonth month) {
        int q = (month.getMonthValue() - 1) / 3 + 1;
        return month.getYear() + "-Q" + q;
    }

    private BigDecimal sumIncomeByCategory(String category, LocalDate start, LocalDate end) {
        LambdaQueryWrapper<FinanceTransaction> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FinanceTransaction::getType, "income")
                .eq(FinanceTransaction::getCategory, category)
                .eq(FinanceTransaction::getApprovalStatus, "approved");
        if (start != null) {
            wrapper.ge(FinanceTransaction::getTransactionDate, start);
        }
        if (end != null) {
            wrapper.le(FinanceTransaction::getTransactionDate, end);
        }
        return transactionMapper.selectList(wrapper).stream()
                .map(FinanceTransaction::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Map<String, BigDecimal> categoryAmountMap(String type, LocalDate start, LocalDate end) {
        return buildCategorySummary(type, start, end).stream()
                .collect(Collectors.toMap(
                        FinanceCategorySummaryVO::getCategory,
                        item -> safeAmount(item.getAmount()),
                        BigDecimal::add,
                        LinkedHashMap::new
                ));
    }

    private void appendCategoryAnalysisRows(List<Map<String, Object>> list, String type,
                                            List<FinanceCategorySummaryVO> current,
                                            Map<String, BigDecimal> previousMap) {
        for (FinanceCategorySummaryVO item : current) {
            BigDecimal currentAmount = safeAmount(item.getAmount());
            BigDecimal previousAmount = safeAmount(previousMap.get(item.getCategory()));
            BigDecimal changeRate = BigDecimal.ZERO;
            if (previousAmount.compareTo(BigDecimal.ZERO) != 0) {
                changeRate = currentAmount.subtract(previousAmount)
                        .divide(previousAmount, 4, RoundingMode.HALF_UP);
            } else if (currentAmount.compareTo(BigDecimal.ZERO) != 0) {
                changeRate = BigDecimal.ONE;
            }
            Map<String, Object> row = new HashMap<>();
            row.put("type", type);
            row.put("category", ("income".equals(type) ? "收入·" : "支出·") + item.getCategory());
            row.put("currentAmount", currentAmount);
            row.put("previousAmount", previousAmount);
            row.put("changeRate", changeRate);
            // 与前端约定：percentage 为 0-100 数值，不再二次 *100
            row.put("percentage", item.getPercentage());
            list.add(row);
        }
    }

    private void applyTransactionDto(FinanceTransaction entity, FinanceTransactionDTO dto, boolean creating) {
        entity.setType(dto.getType());
        entity.setAmount(dto.getAmount());
        entity.setCategory(dto.getCategory());
        entity.setSubCategory(emptyToNull(dto.getSubCategory()));
        entity.setDescription(emptyToNull(dto.getDescription()));
        entity.setTransactionDate(LocalDate.parse(dto.getTransactionDate(), DATE_FORMATTER));
        entity.setPaymentMethod(emptyToNull(dto.getPaymentMethod()));
        entity.setCounterparty(emptyToNull(dto.getCounterparty()));
        if (dto.getInvoiceStatus() != null && !dto.getInvoiceStatus().isBlank()) {
            entity.setInvoiceStatus(dto.getInvoiceStatus());
        } else if (creating || entity.getInvoiceStatus() == null) {
            entity.setInvoiceStatus("none");
        }
    }

    /** 简单 CSV 行解析，支持双引号包裹字段（含逗号） */
    private List<String> parseCsvLine(String line) {
        List<String> cols = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (inQuotes) {
                if (ch == '"') {
                    if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
                        cur.append('"');
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    cur.append(ch);
                }
            } else if (ch == '"') {
                inQuotes = true;
            } else if (ch == ',') {
                cols.add(cur.toString());
                cur.setLength(0);
            } else {
                cur.append(ch);
            }
        }
        cols.add(cur.toString());
        return cols;
    }

    private String emptyToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value;
    }

    private String csv(Object value) {
        if (value == null) {
            return "";
        }
        String text = String.valueOf(value).replace("\"", "\"\"");
        if (text.contains(",") || text.contains("\"") || text.contains("\n")) {
            return "\"" + text + "\"";
        }
        return text;
    }

    private Map<String, Object> buildCategory(Long id, String name, String type, Long parentId) {
        Map<String, Object> cat = new HashMap<>();
        cat.put("id", id);
        cat.put("name", name);
        cat.put("type", type);
        cat.put("parentId", parentId);
        return cat;
    }

    /** 将已付款订单同步为财务收入流水（幂等，按订单号去重） */
    private void syncPaidOrdersToFinance() {
        List<Order> orders = orderMapper.selectList(new LambdaQueryWrapper<Order>()
                .in(Order::getStatus, List.of("paid", "shipped", "completed")));
        for (Order order : orders) {
            if (order.getPayAmount() == null || order.getOrderNo() == null) {
                continue;
            }
            String marker = "订单收入 " + order.getOrderNo();
            Long exists = transactionMapper.selectCount(new LambdaQueryWrapper<FinanceTransaction>()
                    .eq(FinanceTransaction::getType, "income")
                    .like(FinanceTransaction::getDescription, order.getOrderNo()));
            if (exists != null && exists > 0) {
                continue;
            }
            FinanceTransaction tx = new FinanceTransaction();
            tx.setType("income");
            tx.setAmount(order.getPayAmount());
            tx.setCategory("商品销售");
            tx.setSubCategory("小程序订单");
            tx.setDescription(marker);
            tx.setTransactionDate(order.getPaidAt() != null ? order.getPaidAt().toLocalDate() : LocalDate.now());
            tx.setPaymentMethod("wechat");
            tx.setCounterparty("用户" + order.getUserId());
            tx.setApprovalStatus("approved");
            tx.setInvoiceStatus("none");
            tx.setCreatedBy("system");
            tx.setCreateTime(LocalDateTime.now());
            tx.setUpdateTime(LocalDateTime.now());
            transactionMapper.insert(tx);
        }
    }
}
