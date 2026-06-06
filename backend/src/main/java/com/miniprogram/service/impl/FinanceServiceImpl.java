package com.miniprogram.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.miniprogram.common.BusinessException;
import com.miniprogram.common.ErrorCode;
import com.miniprogram.common.PageResult;
import com.miniprogram.dto.finance.*;
import com.miniprogram.entity.FinanceBudget;
import com.miniprogram.entity.FinanceInvoice;
import com.miniprogram.entity.FinanceTransaction;
import com.miniprogram.mapper.FinanceBudgetMapper;
import com.miniprogram.mapper.FinanceInvoiceMapper;
import com.miniprogram.mapper.FinanceTransactionMapper;
import com.miniprogram.service.FinanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * 财务管理 Service 实现
 */
@Service
@RequiredArgsConstructor
public class FinanceServiceImpl implements FinanceService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final FinanceTransactionMapper transactionMapper;
    private final FinanceBudgetMapper budgetMapper;
    private final FinanceInvoiceMapper invoiceMapper;

    // ==================== 财务概览 ====================

    @Override
    public FinanceDashboardVO getDashboard() {
        FinanceDashboardVO vo = new FinanceDashboardVO();
        vo.setTotalIncome(new BigDecimal("1285600.00"));
        vo.setTotalExpense(new BigDecimal("856300.00"));
        vo.setNetProfit(new BigDecimal("429300.00"));
        vo.setPendingInvoiceCount(12);
        vo.setBudgetUsageRate(new BigDecimal("68.5"));
        vo.setIncomeChange(new BigDecimal("12.5"));
        vo.setExpenseChange(new BigDecimal("-3.2"));
        vo.setProfitChange(new BigDecimal("28.6"));
        return vo;
    }

    @Override
    public List<FinanceTrendVO> getTrend(String startDate, String endDate, String granularity) {
        List<FinanceTrendVO> list = new ArrayList<>();
        LocalDate start = LocalDate.parse(startDate, DATE_FORMATTER);
        LocalDate end = endDate != null ? LocalDate.parse(endDate, DATE_FORMATTER) : start.plusMonths(5);

        LocalDate current = start;
        Random random = new Random(42);
        while (!current.isAfter(end)) {
            FinanceTrendVO vo = new FinanceTrendVO();
            vo.setDate(current.format(DATE_FORMATTER));
            BigDecimal income = new BigDecimal(50000 + random.nextInt(30000));
            BigDecimal expense = new BigDecimal(30000 + random.nextInt(20000));
            vo.setIncome(income);
            vo.setExpense(expense);
            vo.setProfit(income.subtract(expense));
            list.add(vo);
            if ("day".equals(granularity)) {
                current = current.plusDays(1);
            } else if ("week".equals(granularity)) {
                current = current.plusWeeks(1);
            } else {
                current = current.plusMonths(1);
            }
        }
        return list;
    }

    @Override
    public List<FinanceCategorySummaryVO> getIncomeCategorySummary(String startDate, String endDate) {
        List<FinanceCategorySummaryVO> list = new ArrayList<>();
        list.add(createCategorySummary("商品销售", new BigDecimal("580000.00"), new BigDecimal("45.1")));
        list.add(createCategorySummary("服务收入", new BigDecimal("320000.00"), new BigDecimal("24.9")));
        list.add(createCategorySummary("会员充值", new BigDecimal("185600.00"), new BigDecimal("14.4")));
        list.add(createCategorySummary("广告收入", new BigDecimal("120000.00"), new BigDecimal("9.3")));
        list.add(createCategorySummary("其他收入", new BigDecimal("80000.00"), new BigDecimal("6.3")));
        return list;
    }

    @Override
    public List<FinanceCategorySummaryVO> getExpenseCategorySummary(String startDate, String endDate) {
        List<FinanceCategorySummaryVO> list = new ArrayList<>();
        list.add(createCategorySummary("人力成本", new BigDecimal("380000.00"), new BigDecimal("44.4")));
        list.add(createCategorySummary("运营费用", new BigDecimal("185000.00"), new BigDecimal("21.6")));
        list.add(createCategorySummary("采购成本", new BigDecimal("142000.00"), new BigDecimal("16.6")));
        list.add(createCategorySummary("营销推广", new BigDecimal("86000.00"), new BigDecimal("10.0")));
        list.add(createCategorySummary("其他支出", new BigDecimal("63300.00"), new BigDecimal("7.4")));
        return list;
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
        return toTransactionVO(entity);
    }

    @Override
    public FinanceTransactionVO updateTransaction(Long id, FinanceTransactionDTO dto) {
        FinanceTransaction entity = getTransactionEntity(id);
        BeanUtils.copyProperties(dto, entity);
        entity.setId(id);
        entity.setTransactionDate(LocalDate.parse(dto.getTransactionDate(), DATE_FORMATTER));
        entity.setUpdateTime(LocalDateTime.now());
        transactionMapper.updateById(entity);
        return toTransactionVO(entity);
    }

    @Override
    public void deleteTransaction(Long id) {
        transactionMapper.deleteById(id);
    }

    @Override
    public void approveTransaction(Long id, String approvalStatus, String reason) {
        FinanceTransaction entity = getTransactionEntity(id);
        entity.setApprovalStatus(approvalStatus);
        entity.setApprovalReason(reason);
        entity.setUpdateTime(LocalDateTime.now());
        transactionMapper.updateById(entity);
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
        budgetMapper.insert(entity);
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
        budgetMapper.updateById(entity);
        return toBudgetVO(entity);
    }

    @Override
    public void deleteBudget(Long id) {
        budgetMapper.deleteById(id);
    }

    @Override
    public List<Map<String, Object>> getBudgetAlerts(Boolean handled) {
        List<Map<String, Object>> list = new ArrayList<>();
        Map<String, Object> alert1 = new HashMap<>();
        alert1.put("id", 1);
        alert1.put("budgetId", 1);
        alert1.put("budgetName", "2024年度运营预算");
        alert1.put("category", "营销推广");
        alert1.put("budgetAmount", new BigDecimal("100000.00"));
        alert1.put("usedAmount", new BigDecimal("86000.00"));
        alert1.put("usageRate", new BigDecimal("86.0"));
        alert1.put("alertThreshold", 80);
        alert1.put("alertTime", "2024-03-15 10:30:00");
        alert1.put("level", "warning");
        alert1.put("handled", false);
        list.add(alert1);

        Map<String, Object> alert2 = new HashMap<>();
        alert2.put("id", 2);
        alert2.put("budgetId", 2);
        alert2.put("budgetName", "2024年度人力预算");
        alert2.put("category", "人力成本");
        alert2.put("budgetAmount", new BigDecimal("400000.00"));
        alert2.put("usedAmount", new BigDecimal("380000.00"));
        alert2.put("usageRate", new BigDecimal("95.0"));
        alert2.put("alertThreshold", 90);
        alert2.put("alertTime", "2024-03-20 14:15:00");
        alert2.put("level", "danger");
        alert2.put("handled", false);
        list.add(alert2);
        return list;
    }

    @Override
    public void handleBudgetAlert(Long id, String note) {
        // 模拟处理预算预警
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
        List<FinanceRoleVO> list = new ArrayList<>();
        list.add(buildRoleVO(1L, "财务查看者", "viewer", "可查看财务数据", List.of("finance:view"), 5));
        list.add(buildRoleVO(2L, "财务编辑者", "editor", "可编辑财务数据", List.of("finance:view", "finance:edit"), 3));
        list.add(buildRoleVO(3L, "财务审批者", "approver", "可审批财务数据", List.of("finance:view", "finance:edit", "finance:approve"), 2));
        list.add(buildRoleVO(4L, "财务管理员", "admin", "拥有全部财务权限", List.of("finance:view", "finance:edit", "finance:approve", "finance:admin"), 1));
        return list;
    }

    @Override
    public FinanceRoleVO createRole(FinanceRoleDTO dto) {
        FinanceRoleVO vo = new FinanceRoleVO();
        vo.setId(System.currentTimeMillis());
        vo.setName(dto.getName());
        vo.setLevel(dto.getLevel());
        vo.setDescription(dto.getDescription());
        vo.setPermissions(dto.getPermissions());
        vo.setMemberCount(0);
        vo.setCreatedAt(LocalDateTime.now().format(DATE_TIME_FORMATTER));
        return vo;
    }

    @Override
    public FinanceRoleVO updateRole(Long id, FinanceRoleDTO dto) {
        FinanceRoleVO vo = new FinanceRoleVO();
        vo.setId(id);
        vo.setName(dto.getName());
        vo.setLevel(dto.getLevel());
        vo.setDescription(dto.getDescription());
        vo.setPermissions(dto.getPermissions());
        vo.setMemberCount(0);
        vo.setCreatedAt(LocalDateTime.now().format(DATE_TIME_FORMATTER));
        return vo;
    }

    @Override
    public void deleteRole(Long id) {
        // 模拟删除角色
    }

    @Override
    public List<Map<String, Object>> getPermissions(Long roleId) {
        List<Map<String, Object>> list = new ArrayList<>();
        Map<String, Object> perm1 = new HashMap<>();
        perm1.put("id", 1);
        perm1.put("userId", 101);
        perm1.put("username", "zhangsan");
        perm1.put("realName", "张三");
        perm1.put("role", Map.of("id", 3, "name", "财务审批者", "level", "approver"));
        perm1.put("scope", List.of("income", "expense"));
        perm1.put("dataRange", "department");
        perm1.put("createdAt", "2024-01-15 10:00:00");
        perm1.put("updatedAt", "2024-01-15 10:00:00");
        list.add(perm1);

        Map<String, Object> perm2 = new HashMap<>();
        perm2.put("id", 2);
        perm2.put("userId", 102);
        perm2.put("username", "lisi");
        perm2.put("realName", "李四");
        perm2.put("role", Map.of("id", 2, "name", "财务编辑者", "level", "editor"));
        perm2.put("scope", List.of("income"));
        perm2.put("dataRange", "self");
        perm2.put("createdAt", "2024-02-01 14:30:00");
        perm2.put("updatedAt", "2024-02-01 14:30:00");
        list.add(perm2);
        return list;
    }

    @Override
    public void assignPermission(Map<String, Object> params) {
        // 模拟分配权限
    }

    @Override
    public void updatePermission(Long id, Map<String, Object> params) {
        // 模拟更新权限
    }

    @Override
    public void removePermission(Long id) {
        // 模拟移除权限
    }

    // ==================== 数据同步 ====================

    @Override
    public Map<String, Object> getSyncStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("lastSyncTime", "2024-03-25 08:30:00");
        status.put("syncSource", "erp");
        status.put("syncStatus", "success");
        status.put("recordCount", 1256);
        return status;
    }

    @Override
    public void triggerSync(String source) {
        // 模拟触发同步
    }

    @Override
    public List<Map<String, Object>> getSyncConfigs() {
        List<Map<String, Object>> list = new ArrayList<>();

        Map<String, Object> config1 = new HashMap<>();
        config1.put("id", 1);
        config1.put("source", "erp");
        config1.put("sourceName", "ERP系统");
        config1.put("enabled", true);
        config1.put("syncInterval", 30);
        config1.put("lastSyncTime", "2024-03-25 08:30:00");
        config1.put("autoSync", true);
        list.add(config1);

        Map<String, Object> config2 = new HashMap<>();
        config2.put("id", 2);
        config2.put("source", "bank");
        config2.put("sourceName", "银行系统");
        config2.put("enabled", true);
        config2.put("syncInterval", 60);
        config2.put("lastSyncTime", "2024-03-25 08:00:00");
        config2.put("autoSync", true);
        list.add(config2);

        Map<String, Object> config3 = new HashMap<>();
        config3.put("id", 3);
        config3.put("source", "tax");
        config3.put("sourceName", "税务系统");
        config3.put("enabled", false);
        config3.put("syncInterval", 1440);
        config3.put("lastSyncTime", "2024-03-24 00:00:00");
        config3.put("autoSync", false);
        list.add(config3);

        return list;
    }

    @Override
    public void updateSyncConfig(Long id, Map<String, Object> data) {
        // 模拟更新同步配置
    }

    // ==================== 财务报表 ====================

    @Override
    public Map<String, Object> getProfitLossReport(String startDate, String endDate) {
        Map<String, Object> data = new HashMap<>();
        data.put("revenue", new BigDecimal("1285600.00"));
        data.put("costOfGoods", new BigDecimal("385680.00"));
        data.put("grossProfit", new BigDecimal("899920.00"));
        data.put("operatingExpenses", new BigDecimal("470620.00"));
        data.put("operatingIncome", new BigDecimal("429300.00"));
        data.put("otherIncome", new BigDecimal("15000.00"));
        data.put("otherExpense", new BigDecimal("8000.00"));
        data.put("profitBeforeTax", new BigDecimal("436300.00"));
        data.put("incomeTax", new BigDecimal("109075.00"));
        data.put("netProfit", new BigDecimal("327225.00"));
        return data;
    }

    @Override
    public Map<String, Object> getCashFlowReport(String startDate, String endDate) {
        Map<String, Object> data = new HashMap<>();
        data.put("operatingInflow", new BigDecimal("1250000.00"));
        data.put("operatingOutflow", new BigDecimal("820000.00"));
        data.put("operatingNet", new BigDecimal("430000.00"));
        data.put("investingInflow", new BigDecimal("50000.00"));
        data.put("investingOutflow", new BigDecimal("120000.00"));
        data.put("investingNet", new BigDecimal("-70000.00"));
        data.put("financingInflow", new BigDecimal("200000.00"));
        data.put("financingOutflow", new BigDecimal("50000.00"));
        data.put("financingNet", new BigDecimal("150000.00"));
        data.put("totalNetCashFlow", new BigDecimal("510000.00"));
        data.put("beginningBalance", new BigDecimal("800000.00"));
        data.put("endingBalance", new BigDecimal("1310000.00"));
        return data;
    }

    @Override
    public List<Map<String, Object>> getCategoryAnalysisReport(String startDate, String endDate) {
        List<Map<String, Object>> list = new ArrayList<>();

        Map<String, Object> item1 = new HashMap<>();
        item1.put("category", "商品销售");
        item1.put("currentAmount", new BigDecimal("580000.00"));
        item1.put("previousAmount", new BigDecimal("510000.00"));
        item1.put("changeRate", new BigDecimal("13.7"));
        item1.put("percentage", new BigDecimal("45.1"));
        list.add(item1);

        Map<String, Object> item2 = new HashMap<>();
        item2.put("category", "服务收入");
        item2.put("currentAmount", new BigDecimal("320000.00"));
        item2.put("previousAmount", new BigDecimal("295000.00"));
        item2.put("changeRate", new BigDecimal("8.5"));
        item2.put("percentage", new BigDecimal("24.9"));
        list.add(item2);

        Map<String, Object> item3 = new HashMap<>();
        item3.put("category", "会员充值");
        item3.put("currentAmount", new BigDecimal("185600.00"));
        item3.put("previousAmount", new BigDecimal("160000.00"));
        item3.put("changeRate", new BigDecimal("16.0"));
        item3.put("percentage", new BigDecimal("14.4"));
        list.add(item3);

        return list;
    }

    // ==================== 私有方法 ====================

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
        vo.setItems(entity.getItems());
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

    private Map<String, Object> buildCategory(Long id, String name, String type, Long parentId) {
        Map<String, Object> cat = new HashMap<>();
        cat.put("id", id);
        cat.put("name", name);
        cat.put("type", type);
        cat.put("parentId", parentId);
        return cat;
    }

    private FinanceRoleVO buildRoleVO(Long id, String name, String level, String description, List<String> permissions, int memberCount) {
        FinanceRoleVO vo = new FinanceRoleVO();
        vo.setId(id);
        vo.setName(name);
        vo.setLevel(level);
        vo.setDescription(description);
        vo.setPermissions(permissions);
        vo.setMemberCount(memberCount);
        vo.setCreatedAt("2024-01-01 00:00:00");
        return vo;
    }
}
