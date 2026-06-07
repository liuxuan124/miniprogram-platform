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
import com.miniprogram.mapper.FinanceBudgetAlertMapper;
import com.miniprogram.mapper.FinanceBudgetMapper;
import com.miniprogram.mapper.FinanceInvoiceMapper;
import com.miniprogram.mapper.FinancePermissionMapper;
import com.miniprogram.mapper.FinanceRoleMapper;
import com.miniprogram.mapper.FinanceSyncConfigMapper;
import com.miniprogram.mapper.FinanceTransactionMapper;
import com.miniprogram.mapper.AdminUserMapper;
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
        LocalDate now = LocalDate.now();
        LocalDate monthStart = now.withDayOfMonth(1);
        LocalDate prevMonthStart = monthStart.minusMonths(1);
        LocalDate prevMonthEnd = monthStart.minusDays(1);

        BigDecimal totalIncome = sumTransactionAmount("income", null, null);
        BigDecimal totalExpense = sumTransactionAmount("expense", null, null);
        BigDecimal currentIncome = sumTransactionAmount("income", monthStart, now);
        BigDecimal currentExpense = sumTransactionAmount("expense", monthStart, now);
        BigDecimal previousIncome = sumTransactionAmount("income", prevMonthStart, prevMonthEnd);
        BigDecimal previousExpense = sumTransactionAmount("expense", prevMonthStart, prevMonthEnd);
        BigDecimal currentProfit = currentIncome.subtract(currentExpense);
        BigDecimal previousProfit = previousIncome.subtract(previousExpense);

        Long pendingInvoices = invoiceMapper.selectCount(new LambdaQueryWrapper<FinanceInvoice>()
                .in(FinanceInvoice::getInvoiceStatus, "pending", "draft"));

        FinanceDashboardVO vo = new FinanceDashboardVO();
        vo.setTotalIncome(totalIncome);
        vo.setTotalExpense(totalExpense);
        vo.setNetProfit(totalIncome.subtract(totalExpense));
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

        List<FinanceTransaction> transactions = listTransactionsBetween(start, end);

        Map<String, FinanceTrendVO> trendMap = new LinkedHashMap<>();
        if ("day".equals(granularity)) {
            LocalDate current = start;
            while (!current.isAfter(end)) {
                trendMap.put(current.format(DATE_FORMATTER), emptyTrend(current.format(DATE_FORMATTER)));
                current = current.plusDays(1);
            }
            for (FinanceTransaction transaction : transactions) {
                String key = transaction.getTransactionDate().format(DATE_FORMATTER);
                FinanceTrendVO trend = trendMap.computeIfAbsent(key, this::emptyTrend);
                applyTransactionToTrend(trend, transaction);
            }
        } else {
            YearMonth cursor = YearMonth.from(start);
            YearMonth endMonth = YearMonth.from(end);
            while (!cursor.isAfter(endMonth)) {
                trendMap.put(cursor.toString(), emptyTrend(cursor.toString()));
                cursor = cursor.plusMonths(1);
            }
            for (FinanceTransaction transaction : transactions) {
                String key = YearMonth.from(transaction.getTransactionDate()).toString();
                FinanceTrendVO trend = trendMap.computeIfAbsent(key, this::emptyTrend);
                applyTransactionToTrend(trend, transaction);
            }
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
                .orderByDesc(FinanceTransaction::getTransactionDate);

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
        BeanUtils.copyProperties(dto, entity);
        entity.setTransactionDate(LocalDate.parse(dto.getTransactionDate(), DATE_FORMATTER));
        if (entity.getInvoiceStatus() == null) {
            entity.setInvoiceStatus("none");
        }
        entity.setApprovalStatus("pending");
        entity.setCreatedBy("admin");
        entity.setCreateTime(LocalDateTime.now());
        entity.setUpdateTime(LocalDateTime.now());
        transactionMapper.insert(entity);
        if ("approved".equals(entity.getApprovalStatus())) {
            recalculateAllBudgets();
        }
        return toTransactionVO(entity);
    }

    @Override
    @Transactional
    public FinanceTransactionVO updateTransaction(Long id, FinanceTransactionDTO dto) {
        FinanceTransaction entity = getTransactionEntity(id);
        BeanUtils.copyProperties(dto, entity);
        entity.setId(id);
        entity.setTransactionDate(LocalDate.parse(dto.getTransactionDate(), DATE_FORMATTER));
        entity.setUpdateTime(LocalDateTime.now());
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
        FinanceTransaction entity = getTransactionEntity(id);
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
                if (rowNum == 1 && line.toLowerCase(Locale.ROOT).startsWith("type,")) {
                    continue;
                }
                String[] cols = line.split(",", -1);
                if (cols.length < 4) {
                    failed++;
                    errors.add("第" + rowNum + "行列数不足");
                    continue;
                }
                try {
                    FinanceTransactionDTO dto = new FinanceTransactionDTO();
                    dto.setType(cols[0].trim());
                    dto.setAmount(new BigDecimal(cols[1].trim()));
                    dto.setCategory(cols[2].trim());
                    dto.setSubCategory(cols.length > 3 && !cols[3].trim().isEmpty() ? cols[3].trim() : null);
                    dto.setDescription(cols.length > 4 ? cols[4].trim() : null);
                    dto.setTransactionDate(cols.length > 5 ? cols[5].trim() : LocalDate.now().format(DATE_FORMATTER));
                    dto.setPaymentMethod(cols.length > 6 ? cols[6].trim() : null);
                    dto.setCounterparty(cols.length > 7 ? cols[7].trim() : null);
                    FinanceTransactionVO created = createTransaction(dto);
                    approveTransaction(created.getId(), "approved", "导入自动审批");
                    success++;
                } catch (Exception ex) {
                    failed++;
                    errors.add("第" + rowNum + "行: " + ex.getMessage());
                }
            }
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
        PageResult<FinanceTransactionVO> page = listTransactions(1, 10000, keyword, type, category,
                startDate, endDate, approvalStatus, invoiceStatus);
        boolean xlsx = "xlsx".equalsIgnoreCase(format) || "excel".equalsIgnoreCase(format);
        try {
            if (xlsx) {
                List<List<Object>> rows = new ArrayList<>();
                for (FinanceTransactionVO item : page.getRecords()) {
                    rows.add(List.of(
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
            for (FinanceTransactionVO item : page.getRecords()) {
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
            list.add(buildCategory(2L, "服务收入", "income", null));
            list.add(buildCategory(3L, "会员充值", "income", null));
            list.add(buildCategory(4L, "广告收入", "income", null));
            list.add(buildCategory(5L, "其他收入", "income", null));
        }
        if (type == null || "expense".equals(type)) {
            list.add(buildCategory(6L, "人力成本", "expense", null));
            list.add(buildCategory(7L, "运营费用", "expense", null));
            list.add(buildCategory(8L, "采购成本", "expense", null));
            list.add(buildCategory(9L, "营销推广", "expense", null));
            list.add(buildCategory(10L, "其他支出", "expense", null));
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
        BeanUtils.copyProperties(dto, entity);
        entity.setIssueDate(LocalDate.parse(dto.getIssueDate(), DATE_FORMATTER));
        entity.setDueDate(LocalDate.parse(dto.getDueDate(), DATE_FORMATTER));
        // 计算税额和价税合计
        BigDecimal taxAmount = dto.getAmount().multiply(dto.getTaxRate()).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = dto.getAmount().add(taxAmount);
        entity.setTaxAmount(taxAmount);
        entity.setTotalAmount(totalAmount);
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
        BeanUtils.copyProperties(dto, entity);
        entity.setId(id);
        entity.setIssueDate(LocalDate.parse(dto.getIssueDate(), DATE_FORMATTER));
        entity.setDueDate(LocalDate.parse(dto.getDueDate(), DATE_FORMATTER));
        BigDecimal taxAmount = dto.getAmount().multiply(dto.getTaxRate()).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = dto.getAmount().add(taxAmount);
        entity.setTaxAmount(taxAmount);
        entity.setTotalAmount(totalAmount);
        entity.setUpdateTime(LocalDateTime.now());
        invoiceMapper.updateById(entity);
        return toInvoiceVO(entity);
    }

    @Override
    public void deleteInvoice(Long id) {
        invoiceMapper.deleteById(id);
    }

    @Override
    public void verifyInvoice(Long id) {
        FinanceInvoice entity = getInvoiceEntity(id);
        entity.setInvoiceStatus("verified");
        entity.setUpdateTime(LocalDateTime.now());
        invoiceMapper.updateById(entity);
    }

    @Override
    public void cancelInvoice(Long id, String reason) {
        FinanceInvoice entity = getInvoiceEntity(id);
        entity.setInvoiceStatus("cancelled");
        entity.setCancelReason(reason);
        entity.setUpdateTime(LocalDateTime.now());
        invoiceMapper.updateById(entity);
    }

    @Override
    public Map<String, Object> calculateTax(BigDecimal amount, BigDecimal taxRate, String type) {
        Map<String, Object> result = new HashMap<>();
        BigDecimal vatAmount = amount.multiply(taxRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal surcharge = vatAmount.multiply(new BigDecimal("0.12")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal taxableIncome = amount.subtract(vatAmount).subtract(surcharge);
        BigDecimal incomeTax = taxableIncome.multiply(new BigDecimal("0.25")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalTax = vatAmount.add(surcharge).add(incomeTax);
        BigDecimal afterTaxIncome = amount.subtract(totalTax);

        result.put("taxableIncome", taxableIncome);
        result.put("vatAmount", vatAmount);
        result.put("surcharge", surcharge);
        result.put("incomeTax", incomeTax);
        result.put("totalTax", totalTax);
        result.put("afterTaxIncome", afterTaxIncome);
        return result;
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
            return status;
        }
        status.put("lastSyncTime", latest.getLastSyncTime() != null
                ? latest.getLastSyncTime().format(DATE_TIME_FORMATTER) : null);
        status.put("syncSource", latest.getSource());
        status.put("syncStatus", latest.getLastSyncStatus());
        status.put("recordCount", latest.getLastRecordCount());
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
        BigDecimal operatingExpenses = totalExpense.subtract(costOfGoods).max(BigDecimal.ZERO);
        BigDecimal grossProfit = revenue.subtract(costOfGoods);
        BigDecimal operatingIncome = revenue.subtract(totalExpense);
        BigDecimal incomeTax = operatingIncome.max(BigDecimal.ZERO)
                .multiply(new BigDecimal("0.25"))
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal netProfit = operatingIncome.subtract(incomeTax);

        Map<String, Object> data = new HashMap<>();
        data.put("revenue", revenue);
        data.put("costOfGoods", costOfGoods);
        data.put("grossProfit", grossProfit);
        data.put("operatingExpenses", operatingExpenses);
        data.put("operatingIncome", operatingIncome);
        data.put("otherIncome", BigDecimal.ZERO);
        data.put("otherExpense", BigDecimal.ZERO);
        data.put("profitBeforeTax", operatingIncome);
        data.put("incomeTax", incomeTax.max(BigDecimal.ZERO));
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
        data.put("beginningBalance", BigDecimal.ZERO);
        data.put("endingBalance", operatingNet.max(BigDecimal.ZERO));
        return data;
    }

    @Override
    public List<Map<String, Object>> getCategoryAnalysisReport(String startDate, String endDate) {
        LocalDate start = parseDate(startDate);
        LocalDate end = parseDate(endDate);
        List<FinanceCategorySummaryVO> incomeSummary = buildCategorySummary("income", start, end);
        List<Map<String, Object>> list = new ArrayList<>();
        for (FinanceCategorySummaryVO item : incomeSummary) {
            Map<String, Object> row = new HashMap<>();
            row.put("category", item.getCategory());
            row.put("currentAmount", item.getAmount());
            row.put("previousAmount", BigDecimal.ZERO);
            row.put("changeRate", BigDecimal.ZERO);
            row.put("percentage", item.getPercentage());
            list.add(row);
        }
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
                rows.add(List.of("【利润表】", "", ""));
                rows.add(List.of("营业收入", profitLoss.get("revenue"), ""));
                rows.add(List.of("营业成本", profitLoss.get("costOfGoods"), ""));
                rows.add(List.of("毛利润", profitLoss.get("grossProfit"), ""));
                rows.add(List.of("运营费用", profitLoss.get("operatingExpenses"), ""));
                rows.add(List.of("营业利润", profitLoss.get("operatingIncome"), ""));
                rows.add(List.of("净利润", profitLoss.get("netProfit"), ""));
                rows.add(List.of("", "", ""));
                rows.add(List.of("【现金流量表】", "", ""));
                rows.add(List.of("经营活动流入", cashFlow.get("operatingInflow"), ""));
                rows.add(List.of("经营活动流出", cashFlow.get("operatingOutflow"), ""));
                rows.add(List.of("经营活动净额", cashFlow.get("operatingNet"), ""));
                rows.add(List.of("现金净增加额", cashFlow.get("totalNetCashFlow"), ""));
                rows.add(List.of("", "", ""));
                rows.add(List.of("【分类分析】", "本期金额", "占比(%)"));
                for (Map<String, Object> row : categoryAnalysis) {
                    rows.add(List.of(row.get("category"), row.get("currentAmount"), row.get("percentage")));
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
            writer.printf(Locale.ROOT, "所得税,%s%n", csv(profitLoss.get("incomeTax")));
            writer.printf(Locale.ROOT, "净利润,%s%n%n", csv(profitLoss.get("netProfit")));

            writer.println("【现金流量表】");
            writer.println("项目,金额");
            writer.printf(Locale.ROOT, "经营活动流入,%s%n", csv(cashFlow.get("operatingInflow")));
            writer.printf(Locale.ROOT, "经营活动流出,%s%n", csv(cashFlow.get("operatingOutflow")));
            writer.printf(Locale.ROOT, "经营活动净额,%s%n", csv(cashFlow.get("operatingNet")));
            writer.printf(Locale.ROOT, "投资活动净额,%s%n", csv(cashFlow.get("investingNet")));
            writer.printf(Locale.ROOT, "筹资活动净额,%s%n", csv(cashFlow.get("financingNet")));
            writer.printf(Locale.ROOT, "现金净增加额,%s%n%n", csv(cashFlow.get("totalNetCashFlow")));

            writer.println("【分类分析】");
            writer.println("分类,本期金额,占比(%)");
            for (Map<String, Object> row : categoryAnalysis) {
                writer.printf(Locale.ROOT, "%s,%s,%s%n",
                        csv(row.get("category")),
                        csv(row.get("currentAmount")),
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
        wrapper.eq(FinanceTransaction::getType, type);
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
        wrapper.ge(FinanceTransaction::getTransactionDate, start)
                .le(FinanceTransaction::getTransactionDate, end);
        return transactionMapper.selectList(wrapper);
    }

    private BigDecimal calculateChangeRate(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.compareTo(BigDecimal.ZERO) == 0) {
            return current != null && current.compareTo(BigDecimal.ZERO) > 0 ? new BigDecimal("100.0") : BigDecimal.ZERO;
        }
        return current.subtract(previous)
                .multiply(new BigDecimal("100"))
                .divide(previous, 1, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateAverageBudgetUsageRate() {
        List<FinanceBudget> budgets = budgetMapper.selectList(new LambdaQueryWrapper<>());
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
        wrapper.eq(FinanceTransaction::getType, type);
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
}
