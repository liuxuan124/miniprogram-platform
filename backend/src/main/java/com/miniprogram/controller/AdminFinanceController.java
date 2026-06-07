package com.miniprogram.controller;

import com.miniprogram.common.PageResult;
import com.miniprogram.common.R;
import com.miniprogram.dto.finance.*;
import com.miniprogram.service.FinanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 后台-财务管理
 */
@RestController
@RequestMapping("/api/v1/admin/finance")
@RequiredArgsConstructor
@Tag(name = "后台-财务管理")
public class AdminFinanceController {

    private final FinanceService financeService;

    // ==================== 财务概览 ====================

    @GetMapping("/dashboard")
    @Operation(summary = "获取财务概览数据")
    public R<FinanceDashboardVO> getDashboard() {
        return R.ok(financeService.getDashboard());
    }

    @GetMapping("/trend")
    @Operation(summary = "获取收支趋势")
    public R<List<FinanceTrendVO>> getTrend(
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(required = false) String granularity) {
        return R.ok(financeService.getTrend(startDate, endDate, granularity));
    }

    @GetMapping("/income-category-summary")
    @Operation(summary = "获取收入分类汇总")
    public R<List<FinanceCategorySummaryVO>> getIncomeCategorySummary(
            @RequestParam String startDate,
            @RequestParam String endDate) {
        return R.ok(financeService.getIncomeCategorySummary(startDate, endDate));
    }

    @GetMapping("/expense-category-summary")
    @Operation(summary = "获取支出分类汇总")
    public R<List<FinanceCategorySummaryVO>> getExpenseCategorySummary(
            @RequestParam String startDate,
            @RequestParam String endDate) {
        return R.ok(financeService.getExpenseCategorySummary(startDate, endDate));
    }

    // ==================== 收支明细 ====================

    @GetMapping("/transactions")
    @Operation(summary = "获取收支记录列表")
    public R<PageResult<FinanceTransactionVO>> listTransactions(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String approvalStatus,
            @RequestParam(required = false) String invoiceStatus) {
        return R.ok(financeService.listTransactions(page, pageSize, keyword, type, category,
                startDate, endDate, approvalStatus, invoiceStatus));
    }

    @GetMapping("/transactions/{id}")
    @Operation(summary = "获取收支记录详情")
    public R<FinanceTransactionVO> getTransaction(@PathVariable Long id) {
        return R.ok(financeService.getTransaction(id));
    }

    @PostMapping("/transactions")
    @Operation(summary = "创建收支记录")
    public R<FinanceTransactionVO> createTransaction(@Valid @RequestBody FinanceTransactionDTO dto) {
        return R.ok(financeService.createTransaction(dto));
    }

    @PutMapping("/transactions/{id}")
    @Operation(summary = "更新收支记录")
    public R<FinanceTransactionVO> updateTransaction(@PathVariable Long id, @Valid @RequestBody FinanceTransactionDTO dto) {
        return R.ok(financeService.updateTransaction(id, dto));
    }

    @DeleteMapping("/transactions/{id}")
    @Operation(summary = "删除收支记录")
    public R<Void> deleteTransaction(@PathVariable Long id) {
        financeService.deleteTransaction(id);
        return R.ok(null);
    }

    @PutMapping("/transactions/{id}/approve")
    @Operation(summary = "审批收支记录")
    public R<Void> approveTransaction(@PathVariable Long id, @RequestBody Map<String, String> body) {
        financeService.approveTransaction(id, body.get("approvalStatus"), body.get("reason"));
        return R.ok(null);
    }

    @PostMapping(value = "/transactions/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "批量导入收支记录")
    public R<Map<String, Object>> importTransactions(@RequestParam("file") MultipartFile file) {
        return R.ok(financeService.importTransactions(file));
    }

    @GetMapping("/transactions/export")
    @Operation(summary = "导出收支记录")
    public void exportTransactions(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String approvalStatus,
            @RequestParam(required = false) String invoiceStatus,
            @RequestParam(required = false, defaultValue = "csv") String format,
            HttpServletResponse response) {
        financeService.exportTransactions(keyword, type, category, startDate, endDate,
                approvalStatus, invoiceStatus, format, response);
    }

    @GetMapping("/transaction-categories")
    @Operation(summary = "获取收支分类列表")
    public R<List<Map<String, Object>>> getTransactionCategories(
            @RequestParam(required = false) String type) {
        return R.ok(financeService.getTransactionCategories(type));
    }

    // ==================== 财务报表 ====================

    @GetMapping("/reports/profit-loss")
    @Operation(summary = "获取利润表")
    public R<Map<String, Object>> getProfitLossReport(
            @RequestParam String startDate,
            @RequestParam String endDate) {
        return R.ok(financeService.getProfitLossReport(startDate, endDate));
    }

    @GetMapping("/reports/cash-flow")
    @Operation(summary = "获取现金流报表")
    public R<Map<String, Object>> getCashFlowReport(
            @RequestParam String startDate,
            @RequestParam String endDate) {
        return R.ok(financeService.getCashFlowReport(startDate, endDate));
    }

    @GetMapping("/reports/category-analysis")
    @Operation(summary = "获取分类分析报表")
    public R<List<Map<String, Object>>> getCategoryAnalysisReport(
            @RequestParam String startDate,
            @RequestParam String endDate) {
        return R.ok(financeService.getCategoryAnalysisReport(startDate, endDate));
    }

    @GetMapping("/reports/export")
    @Operation(summary = "导出报表")
    public void exportReport(
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(required = false, defaultValue = "csv") String format,
            HttpServletResponse response) {
        financeService.exportReport(startDate, endDate, format, response);
    }

    // ==================== 预算管理 ====================

    @GetMapping("/budgets")
    @Operation(summary = "获取预算列表")
    public R<PageResult<FinanceBudgetVO>> listBudgets(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {
        return R.ok(financeService.listBudgets(page, pageSize, status, keyword));
    }

    @GetMapping("/budgets/alerts")
    @Operation(summary = "获取预算预警列表")
    public R<List<Map<String, Object>>> getBudgetAlerts(
            @RequestParam(required = false) Boolean handled) {
        return R.ok(financeService.getBudgetAlerts(handled));
    }

    @PutMapping("/budgets/alerts/{id}/handle")
    @Operation(summary = "处理预算预警")
    public R<Void> handleBudgetAlert(@PathVariable Long id, @RequestBody Map<String, String> body) {
        financeService.handleBudgetAlert(id, body.get("note"));
        return R.ok(null);
    }

    @PutMapping("/budgets/{id}/activate")
    @Operation(summary = "启用预算")
    public R<FinanceBudgetVO> activateBudget(@PathVariable Long id) {
        return R.ok(financeService.activateBudget(id));
    }

    @GetMapping("/budgets/{id}")
    @Operation(summary = "获取预算详情")
    public R<FinanceBudgetVO> getBudget(@PathVariable Long id) {
        return R.ok(financeService.getBudget(id));
    }

    @PostMapping("/budgets")
    @Operation(summary = "创建预算")
    public R<FinanceBudgetVO> createBudget(@Valid @RequestBody FinanceBudgetDTO dto) {
        return R.ok(financeService.createBudget(dto));
    }

    @PutMapping("/budgets/{id}")
    @Operation(summary = "更新预算")
    public R<FinanceBudgetVO> updateBudget(@PathVariable Long id, @Valid @RequestBody FinanceBudgetDTO dto) {
        return R.ok(financeService.updateBudget(id, dto));
    }

    @DeleteMapping("/budgets/{id}")
    @Operation(summary = "删除预算")
    public R<Void> deleteBudget(@PathVariable Long id) {
        financeService.deleteBudget(id);
        return R.ok(null);
    }

    // ==================== 发票管理 ====================

    @GetMapping("/invoices")
    @Operation(summary = "获取发票列表")
    public R<PageResult<FinanceInvoiceVO>> listInvoices(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String invoiceType,
            @RequestParam(required = false) String invoiceStatus,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return R.ok(financeService.listInvoices(page, pageSize, keyword, invoiceType,
                invoiceStatus, startDate, endDate));
    }

    @GetMapping("/invoices/{id}")
    @Operation(summary = "获取发票详情")
    public R<FinanceInvoiceVO> getInvoice(@PathVariable Long id) {
        return R.ok(financeService.getInvoice(id));
    }

    @PostMapping("/invoices")
    @Operation(summary = "创建发票")
    public R<FinanceInvoiceVO> createInvoice(@Valid @RequestBody FinanceInvoiceDTO dto) {
        return R.ok(financeService.createInvoice(dto));
    }

    @PutMapping("/invoices/{id}")
    @Operation(summary = "更新发票")
    public R<FinanceInvoiceVO> updateInvoice(@PathVariable Long id, @Valid @RequestBody FinanceInvoiceDTO dto) {
        return R.ok(financeService.updateInvoice(id, dto));
    }

    @DeleteMapping("/invoices/{id}")
    @Operation(summary = "删除发票")
    public R<Void> deleteInvoice(@PathVariable Long id) {
        financeService.deleteInvoice(id);
        return R.ok(null);
    }

    @PutMapping("/invoices/{id}/verify")
    @Operation(summary = "核验发票")
    public R<Void> verifyInvoice(@PathVariable Long id) {
        financeService.verifyInvoice(id);
        return R.ok(null);
    }

    @PutMapping("/invoices/{id}/cancel")
    @Operation(summary = "作废发票")
    public R<Void> cancelInvoice(@PathVariable Long id, @RequestBody Map<String, String> body) {
        financeService.cancelInvoice(id, body.get("reason"));
        return R.ok(null);
    }

    @PostMapping("/tax/calculate")
    @Operation(summary = "税务计算")
    public R<Map<String, Object>> calculateTax(@RequestBody Map<String, Object> body) {
        BigDecimal amount = new BigDecimal(body.get("amount").toString());
        BigDecimal taxRate = new BigDecimal(body.get("taxRate").toString());
        String type = (String) body.get("type");
        return R.ok(financeService.calculateTax(amount, taxRate, type));
    }

    // ==================== 财务权限 ====================

    @GetMapping("/roles")
    @Operation(summary = "获取财务角色列表")
    public R<List<FinanceRoleVO>> getRoles() {
        return R.ok(financeService.getRoles());
    }

    @PostMapping("/roles")
    @Operation(summary = "创建财务角色")
    public R<FinanceRoleVO> createRole(@Valid @RequestBody FinanceRoleDTO dto) {
        return R.ok(financeService.createRole(dto));
    }

    @PutMapping("/roles/{id}")
    @Operation(summary = "更新财务角色")
    public R<FinanceRoleVO> updateRole(@PathVariable Long id, @Valid @RequestBody FinanceRoleDTO dto) {
        return R.ok(financeService.updateRole(id, dto));
    }

    @DeleteMapping("/roles/{id}")
    @Operation(summary = "删除财务角色")
    public R<Void> deleteRole(@PathVariable Long id) {
        financeService.deleteRole(id);
        return R.ok(null);
    }

    @GetMapping("/permissions")
    @Operation(summary = "获取财务权限列表")
    public R<List<Map<String, Object>>> getPermissions(
            @RequestParam(required = false) Long roleId) {
        return R.ok(financeService.getPermissions(roleId));
    }

    @PostMapping("/permissions")
    @Operation(summary = "分配财务权限")
    public R<Void> assignPermission(@RequestBody Map<String, Object> params) {
        financeService.assignPermission(params);
        return R.ok(null);
    }

    @PutMapping("/permissions/{id}")
    @Operation(summary = "更新财务权限")
    public R<Void> updatePermission(@PathVariable Long id, @RequestBody Map<String, Object> params) {
        financeService.updatePermission(id, params);
        return R.ok(null);
    }

    @DeleteMapping("/permissions/{id}")
    @Operation(summary = "移除财务权限")
    public R<Void> removePermission(@PathVariable Long id) {
        financeService.removePermission(id);
        return R.ok(null);
    }

    // ==================== 数据同步 ====================

    @GetMapping("/sync/status")
    @Operation(summary = "获取同步状态")
    public R<Map<String, Object>> getSyncStatus() {
        return R.ok(financeService.getSyncStatus());
    }

    @PostMapping("/sync/trigger")
    @Operation(summary = "触发手动同步")
    public R<Void> triggerSync(@RequestBody(required = false) Map<String, String> body) {
        String source = body != null ? body.get("source") : null;
        financeService.triggerSync(source);
        return R.ok(null);
    }

    @GetMapping("/sync/configs")
    @Operation(summary = "获取同步配置列表")
    public R<List<Map<String, Object>>> getSyncConfigs() {
        return R.ok(financeService.getSyncConfigs());
    }

    @PutMapping("/sync/configs/{id}")
    @Operation(summary = "更新同步配置")
    public R<Void> updateSyncConfig(@PathVariable Long id, @RequestBody Map<String, Object> data) {
        financeService.updateSyncConfig(id, data);
        return R.ok(null);
    }
}
