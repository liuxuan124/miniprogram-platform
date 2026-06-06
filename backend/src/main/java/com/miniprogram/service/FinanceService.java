package com.miniprogram.service;

import com.miniprogram.common.PageResult;
import com.miniprogram.dto.finance.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 财务管理 Service 接口
 */
public interface FinanceService {

    // ==================== 财务概览 ====================

    FinanceDashboardVO getDashboard();

    List<FinanceTrendVO> getTrend(String startDate, String endDate, String granularity);

    List<FinanceCategorySummaryVO> getIncomeCategorySummary(String startDate, String endDate);

    List<FinanceCategorySummaryVO> getExpenseCategorySummary(String startDate, String endDate);

    // ==================== 收支明细 ====================

    PageResult<FinanceTransactionVO> listTransactions(Integer page, Integer pageSize, String keyword,
                                                       String type, String category, String startDate,
                                                       String endDate, String approvalStatus, String invoiceStatus);

    FinanceTransactionVO getTransaction(Long id);

    FinanceTransactionVO createTransaction(FinanceTransactionDTO dto);

    FinanceTransactionVO updateTransaction(Long id, FinanceTransactionDTO dto);

    void deleteTransaction(Long id);

    void approveTransaction(Long id, String approvalStatus, String reason);

    List<Map<String, Object>> getTransactionCategories(String type);

    // ==================== 预算管理 ====================

    PageResult<FinanceBudgetVO> listBudgets(Integer page, Integer pageSize, String status, String keyword);

    FinanceBudgetVO getBudget(Long id);

    FinanceBudgetVO createBudget(FinanceBudgetDTO dto);

    FinanceBudgetVO updateBudget(Long id, FinanceBudgetDTO dto);

    void deleteBudget(Long id);

    List<Map<String, Object>> getBudgetAlerts(Boolean handled);

    void handleBudgetAlert(Long id, String note);

    // ==================== 发票管理 ====================

    PageResult<FinanceInvoiceVO> listInvoices(Integer page, Integer pageSize, String keyword,
                                               String invoiceType, String invoiceStatus,
                                               String startDate, String endDate);

    FinanceInvoiceVO getInvoice(Long id);

    FinanceInvoiceVO createInvoice(FinanceInvoiceDTO dto);

    FinanceInvoiceVO updateInvoice(Long id, FinanceInvoiceDTO dto);

    void deleteInvoice(Long id);

    void verifyInvoice(Long id);

    void cancelInvoice(Long id, String reason);

    Map<String, Object> calculateTax(BigDecimal amount, BigDecimal taxRate, String type);

    // ==================== 财务权限 ====================

    List<FinanceRoleVO> getRoles();

    FinanceRoleVO createRole(FinanceRoleDTO dto);

    FinanceRoleVO updateRole(Long id, FinanceRoleDTO dto);

    void deleteRole(Long id);

    List<Map<String, Object>> getPermissions(Long roleId);

    void assignPermission(Map<String, Object> params);

    void updatePermission(Long id, Map<String, Object> params);

    void removePermission(Long id);

    // ==================== 数据同步 ====================

    Map<String, Object> getSyncStatus();

    void triggerSync(String source);

    List<Map<String, Object>> getSyncConfigs();

    void updateSyncConfig(Long id, Map<String, Object> data);

    // ==================== 财务报表 ====================

    Map<String, Object> getProfitLossReport(String startDate, String endDate);

    Map<String, Object> getCashFlowReport(String startDate, String endDate);

    List<Map<String, Object>> getCategoryAnalysisReport(String startDate, String endDate);
}
