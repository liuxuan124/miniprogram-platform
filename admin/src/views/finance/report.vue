<template>
  <div class="finance-report">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-info">
        <h2>财务报表</h2>
        <p>多维度财务数据分析与报表生成</p>
      </div>
    </div>

    <!-- 报表控制工具栏 -->
    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar">
        <el-tabs v-model="activeTab" class="report-tabs" @tab-change="handleTabChange">
          <el-tab-pane label="收支分析" name="income_expense" />
          <el-tab-pane label="利润表" name="profit_loss" />
          <el-tab-pane label="现金流量表" name="cash_flow" />
          <el-tab-pane label="分类对比分析" name="category_analysis" />
        </el-tabs>
        <div class="toolbar-actions">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            :shortcuts="dateShortcuts"
            style="width: 280px"
            @change="fetchData"
          />
          <el-select
            v-if="activeTab === 'income_expense'"
            v-model="granularity"
            placeholder="粒度"
            style="width: 100px"
            @change="fetchData"
          >
            <el-option label="日" value="day" />
            <el-option label="周" value="week" />
            <el-option label="月" value="month" />
            <el-option label="季" value="quarter" />
            <el-option label="年" value="year" />
          </el-select>
          <el-button type="primary" :icon="Download" :loading="exportLoading" @click="handleExport">
            导出报表
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 收支分析 -->
    <template v-if="activeTab === 'income_expense'">
      <el-card v-loading="loading" shadow="hover" class="chart-card">
        <template #header>
          <span>收支趋势</span>
        </template>
        <div ref="trendChartRef" class="chart-container" />
      </el-card>

      <el-row :gutter="16" class="summary-cards">
        <el-col :span="6">
          <el-card shadow="hover" class="summary-card income">
            <div class="summary-label">总收入</div>
            <div class="summary-value">¥{{ formatMoney(trendSummary.totalIncome) }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="summary-card expense">
            <div class="summary-label">总支出</div>
            <div class="summary-value">¥{{ formatMoney(trendSummary.totalExpense) }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="summary-card profit">
            <div class="summary-label">净利润</div>
            <div class="summary-value" :class="{ negative: trendSummary.netProfit < 0 }">
              ¥{{ formatMoney(trendSummary.netProfit) }}
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="summary-card avg">
            <div class="summary-label">日均收入</div>
            <div class="summary-value">¥{{ formatMoney(trendSummary.avgDailyIncome) }}</div>
          </el-card>
        </el-col>
      </el-row>
    </template>

    <!-- 利润表 -->
    <template v-if="activeTab === 'profit_loss'">
      <el-card v-loading="loading" shadow="hover">
        <template #header>
          <span>利润表</span>
        </template>
        <el-table :data="profitLossRows" border style="width: 100%" :row-class-name="profitRowClass">
          <el-table-column prop="label" label="项目" min-width="240">
            <template #default="{ row }">
              <span :class="{ 'row-bold': row.bold, 'row-highlight': row.highlight }">{{ row.label }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="amount" label="金额（元）" align="right" min-width="180">
            <template #default="{ row }">
              <span :class="{ 'row-bold': row.bold, 'row-highlight': row.highlight }">
                ¥{{ formatMoney(row.amount) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="percentage" label="占营收比例" align="right" min-width="140">
            <template #default="{ row }">
              <span :class="{ 'row-bold': row.bold, 'row-highlight': row.highlight }">
                {{ row.percentage != null ? (row.percentage * 100).toFixed(2) + '%' : '-' }}
              </span>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>

    <!-- 现金流量表 -->
    <template v-if="activeTab === 'cash_flow'">
      <div v-loading="loading">
        <el-row :gutter="16" class="cashflow-section">
          <el-col :span="8">
            <el-card shadow="hover" class="cashflow-card operating">
              <div class="cashflow-title">经营活动</div>
              <div class="cashflow-row">
                <span class="cashflow-label">流入</span>
                <span class="cashflow-value inflow">¥{{ formatMoney(cashFlow.operatingInflow) }}</span>
              </div>
              <div class="cashflow-row">
                <span class="cashflow-label">流出</span>
                <span class="cashflow-value outflow">¥{{ formatMoney(cashFlow.operatingOutflow) }}</span>
              </div>
              <el-divider />
              <div class="cashflow-row">
                <span class="cashflow-label net">净额</span>
                <span class="cashflow-value net" :class="{ negative: cashFlow.operatingNet < 0 }">
                  ¥{{ formatMoney(cashFlow.operatingNet) }}
                </span>
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="hover" class="cashflow-card investing">
              <div class="cashflow-title">投资活动</div>
              <div class="cashflow-row">
                <span class="cashflow-label">流入</span>
                <span class="cashflow-value inflow">¥{{ formatMoney(cashFlow.investingInflow) }}</span>
              </div>
              <div class="cashflow-row">
                <span class="cashflow-label">流出</span>
                <span class="cashflow-value outflow">¥{{ formatMoney(cashFlow.investingOutflow) }}</span>
              </div>
              <el-divider />
              <div class="cashflow-row">
                <span class="cashflow-label net">净额</span>
                <span class="cashflow-value net" :class="{ negative: cashFlow.investingNet < 0 }">
                  ¥{{ formatMoney(cashFlow.investingNet) }}
                </span>
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="hover" class="cashflow-card financing">
              <div class="cashflow-title">筹资活动</div>
              <div class="cashflow-row">
                <span class="cashflow-label">流入</span>
                <span class="cashflow-value inflow">¥{{ formatMoney(cashFlow.financingInflow) }}</span>
              </div>
              <div class="cashflow-row">
                <span class="cashflow-label">流出</span>
                <span class="cashflow-value outflow">¥{{ formatMoney(cashFlow.financingOutflow) }}</span>
              </div>
              <el-divider />
              <div class="cashflow-row">
                <span class="cashflow-label net">净额</span>
                <span class="cashflow-value net" :class="{ negative: cashFlow.financingNet < 0 }">
                  ¥{{ formatMoney(cashFlow.financingNet) }}
                </span>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <el-card shadow="hover" class="cashflow-summary">
          <el-row :gutter="16" justify="center" align="middle">
            <el-col :span="8" class="summary-item">
              <div class="summary-label">期初余额</div>
              <div class="summary-value">¥{{ formatMoney(cashFlow.beginningBalance) }}</div>
            </el-col>
            <el-col :span="8" class="summary-item">
              <div class="summary-label">净增减</div>
              <div class="summary-value" :class="{ negative: cashFlow.totalNetCashFlow < 0 }">
                ¥{{ formatMoney(cashFlow.totalNetCashFlow) }}
              </div>
            </el-col>
            <el-col :span="8" class="summary-item">
              <div class="summary-label">期末余额</div>
              <div class="summary-value">¥{{ formatMoney(cashFlow.endingBalance) }}</div>
            </el-col>
          </el-row>
        </el-card>
      </div>
    </template>

    <!-- 分类对比分析 -->
    <template v-if="activeTab === 'category_analysis'">
      <el-card v-loading="loading" shadow="hover" class="chart-card">
        <template #header>
          <span>分类对比</span>
        </template>
        <div ref="categoryChartRef" class="chart-container" />
      </el-card>

      <el-card shadow="hover" style="margin-top: 16px">
        <el-table :data="categoryData" border style="width: 100%">
          <el-table-column prop="category" label="分类" min-width="160" />
          <el-table-column prop="currentAmount" label="本期金额" align="right" min-width="160">
            <template #default="{ row }">
              ¥{{ formatMoney(row.currentAmount) }}
            </template>
          </el-table-column>
          <el-table-column prop="previousAmount" label="上期金额" align="right" min-width="160">
            <template #default="{ row }">
              ¥{{ formatMoney(row.previousAmount) }}
            </template>
          </el-table-column>
          <el-table-column prop="changeRate" label="变动率" align="right" min-width="120">
            <template #default="{ row }">
              <span :class="{ 'change-up': row.changeRate > 0, 'change-down': row.changeRate < 0 }">
                {{ row.changeRate > 0 ? '+' : '' }}{{ (row.changeRate * 100).toFixed(2) }}%
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="percentage" label="占比" align="right" min-width="120">
            <template #default="{ row }">
              {{ (row.percentage * 100).toFixed(2) }}%
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import {
  getFinanceTrend,
  getProfitLossReport,
  getCashFlowReport,
  getCategoryAnalysisReport,
  exportReport,
} from '@/api/finance'
import type {
  FinanceTrendItem,
  ProfitLossData,
  CashFlowData,
  CategoryAnalysisItem,
  ReportQueryParams,
} from '@/types/finance'

// ==================== 状态 ====================

const activeTab = ref<string>('income_expense')
const dateRange = ref<[string, string]>(getDefaultDateRange())
const granularity = ref<string>('month')
const loading = ref(false)
const exportLoading = ref(false)

// 收支分析
const trendData = ref<FinanceTrendItem[]>([])
const trendChartRef = ref<HTMLElement>()
let trendChart: echarts.ECharts | null = null

// 利润表
const profitLoss = ref<ProfitLossData>(createEmptyProfitLoss())

// 现金流量表
const cashFlow = ref<CashFlowData>(createEmptyCashFlow())

// 分类对比
const categoryData = ref<CategoryAnalysisItem[]>([])
const categoryChartRef = ref<HTMLElement>()
let categoryChart: echarts.ECharts | null = null

// ==================== 日期快捷项 ====================

const dateShortcuts = [
  {
    text: '近7天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 7)
      return [start, end]
    },
  },
  {
    text: '近30天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)
      return [start, end]
    },
  },
  {
    text: '近90天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 90)
      return [start, end]
    },
  },
  {
    text: '本年度',
    value: () => {
      const end = new Date()
      const start = new Date(new Date().getFullYear(), 0, 1)
      return [start, end]
    },
  },
]

// ==================== 工具函数 ====================

function getDefaultDateRange(): [string, string] {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
}

function formatMoney(value: number): string {
  if (value == null) return '0.00'
  return Math.abs(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function createEmptyProfitLoss(): ProfitLossData {
  return {
    revenue: 0,
    costOfGoods: 0,
    grossProfit: 0,
    operatingExpenses: 0,
    operatingIncome: 0,
    otherIncome: 0,
    otherExpense: 0,
    profitBeforeTax: 0,
    incomeTax: 0,
    netProfit: 0,
  }
}

function createEmptyCashFlow(): CashFlowData {
  return {
    operatingInflow: 0,
    operatingOutflow: 0,
    operatingNet: 0,
    investingInflow: 0,
    investingOutflow: 0,
    investingNet: 0,
    financingInflow: 0,
    financingOutflow: 0,
    financingNet: 0,
    totalNetCashFlow: 0,
    beginningBalance: 0,
    endingBalance: 0,
  }
}

function getQueryParams(): ReportQueryParams {
  return {
    reportType: activeTab.value as ReportQueryParams['reportType'],
    startDate: dateRange.value?.[0] || '',
    endDate: dateRange.value?.[1] || '',
    granularity: activeTab.value === 'income_expense' ? granularity.value as ReportQueryParams['granularity'] : undefined,
  }
}

// ==================== 收支趋势汇总 ====================

const trendSummary = computed(() => {
  const data = trendData.value
  if (!data.length) {
    return { totalIncome: 0, totalExpense: 0, netProfit: 0, avgDailyIncome: 0 }
  }
  const totalIncome = data.reduce((s, i) => s + i.income, 0)
  const totalExpense = data.reduce((s, i) => s + i.expense, 0)
  const days = data.length
  return {
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    avgDailyIncome: totalIncome / days,
  }
})

// ==================== 利润表行数据 ====================

const profitLossRows = computed(() => {
  const d = profitLoss.value
  const rev = d.revenue || 1
  return [
    { label: '营业收入', amount: d.revenue, percentage: 1, bold: false, highlight: false },
    { label: '减：营业成本', amount: -d.costOfGoods, percentage: d.costOfGoods / rev, bold: false, highlight: false },
    { label: '毛利润', amount: d.grossProfit, percentage: d.grossProfit / rev, bold: true, highlight: false },
    { label: '减：运营费用', amount: -d.operatingExpenses, percentage: d.operatingExpenses / rev, bold: false, highlight: false },
    { label: '营业利润', amount: d.operatingIncome, percentage: d.operatingIncome / rev, bold: true, highlight: false },
    { label: '加：其他收入', amount: d.otherIncome, percentage: d.otherIncome / rev, bold: false, highlight: false },
    { label: '减：其他支出', amount: -d.otherExpense, percentage: d.otherExpense / rev, bold: false, highlight: false },
    { label: '税前利润', amount: d.profitBeforeTax, percentage: d.profitBeforeTax / rev, bold: true, highlight: false },
    { label: '减：所得税', amount: -d.incomeTax, percentage: d.incomeTax / rev, bold: false, highlight: false },
    { label: '净利润', amount: d.netProfit, percentage: d.netProfit / rev, bold: true, highlight: true },
  ]
})

function profitRowClass({ row }: { row: { bold: boolean; highlight: boolean } }): string {
  if (row.highlight) return 'row-highlight'
  if (row.bold) return 'row-bold-bg'
  return ''
}

// ==================== 数据请求 ====================

async function fetchData() {
  if (!dateRange.value?.[0] || !dateRange.value?.[1]) return

  loading.value = true
  try {
    const params = getQueryParams()
    switch (activeTab.value) {
      case 'income_expense':
        await fetchTrendData(params)
        break
      case 'profit_loss':
        await fetchProfitLossData(params)
        break
      case 'cash_flow':
        await fetchCashFlowData(params)
        break
      case 'category_analysis':
        await fetchCategoryData(params)
        break
    }
  } finally {
    loading.value = false
  }
}

async function fetchTrendData(params: ReportQueryParams) {
  try {
    const res = await getFinanceTrend({
      startDate: params.startDate,
      endDate: params.endDate,
      granularity: params.granularity,
    })
    trendData.value = res.data || []
    await nextTick()
    renderTrendChart()
  } catch {
    trendData.value = []
  }
}

async function fetchProfitLossData(params: ReportQueryParams) {
  try {
    const res = await getProfitLossReport(params)
    profitLoss.value = res.data || createEmptyProfitLoss()
  } catch {
    profitLoss.value = createEmptyProfitLoss()
  }
}

async function fetchCashFlowData(params: ReportQueryParams) {
  try {
    const res = await getCashFlowReport(params)
    cashFlow.value = res.data || createEmptyCashFlow()
  } catch {
    cashFlow.value = createEmptyCashFlow()
  }
}

async function fetchCategoryData(params: ReportQueryParams) {
  try {
    const res = await getCategoryAnalysisReport(params)
    categoryData.value = res.data || []
    await nextTick()
    renderCategoryChart()
  } catch {
    categoryData.value = []
  }
}

// ==================== ECharts 渲染 ====================

function renderTrendChart() {
  if (!trendChartRef.value) return
  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value)
  }
  const data = trendData.value
  const dates = data.map(i => i.date)
  const incomes = data.map(i => i.income)
  const expenses = data.map(i => i.expense)
  const profits = data.map(i => i.profit)

  trendChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter(params: any[]) {
        let html = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`
        params.forEach(p => {
          html += `<div style="display:flex;align-items:center;gap:6px">
            ${p.marker}<span>${p.seriesName}：</span>
            <span style="font-weight:600">¥${Number(p.value).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
          </div>`
        })
        return html
      },
    },
    legend: {
      data: ['收入', '支出', '净利润'],
      top: 0,
    },
    grid: {
      left: 60,
      right: 40,
      top: 40,
      bottom: 30,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { fontSize: 11 },
    },
    yAxis: [
      {
        type: 'value',
        name: '金额（元）',
        axisLabel: {
          fontSize: 11,
          formatter: (val: number) => val >= 10000 ? (val / 10000).toFixed(1) + '万' : val.toFixed(0),
        },
      },
    ],
    series: [
      {
        name: '收入',
        type: 'bar',
        data: incomes,
        itemStyle: { color: '#67c23a' },
        barMaxWidth: 28,
      },
      {
        name: '支出',
        type: 'bar',
        data: expenses,
        itemStyle: { color: '#f56c6c' },
        barMaxWidth: 28,
      },
      {
        name: '净利润',
        type: 'line',
        data: profits,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2, color: '#409eff' },
        itemStyle: { color: '#409eff' },
      },
    ],
  }, true)
}

function renderCategoryChart() {
  if (!categoryChartRef.value) return
  if (!categoryChart) {
    categoryChart = echarts.init(categoryChartRef.value)
  }
  const data = categoryData.value
  const categories = data.map(i => i.category)
  const currentAmounts = data.map(i => i.currentAmount)
  const previousAmounts = data.map(i => i.previousAmount)

  categoryChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter(params: any[]) {
        let html = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`
        params.forEach(p => {
          html += `<div style="display:flex;align-items:center;gap:6px">
            ${p.marker}<span>${p.seriesName}：</span>
            <span style="font-weight:600">¥${Number(p.value).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
          </div>`
        })
        return html
      },
    },
    legend: {
      data: ['本期金额', '上期金额'],
      top: 0,
    },
    grid: {
      left: 100,
      right: 40,
      top: 40,
      bottom: 30,
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 11,
        formatter: (val: number) => val >= 10000 ? (val / 10000).toFixed(1) + '万' : val.toFixed(0),
      },
    },
    yAxis: {
      type: 'category',
      data: categories,
      axisLabel: { fontSize: 12 },
    },
    series: [
      {
        name: '本期金额',
        type: 'bar',
        data: currentAmounts,
        itemStyle: { color: '#409eff' },
        barMaxWidth: 20,
      },
      {
        name: '上期金额',
        type: 'bar',
        data: previousAmounts,
        itemStyle: { color: '#e6e8eb' },
        barMaxWidth: 20,
      },
    ],
  }, true)
}

// ==================== 事件处理 ====================

function handleTabChange() {
  fetchData()
}

async function handleExport() {
  const params = getQueryParams()
  exportLoading.value = true
  try {
    const res = await exportReport(params)
    const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `财务报表_${params.startDate}_${params.endDate}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('报表导出成功')
  } catch {
    ElMessage.error('报表导出失败')
  } finally {
    exportLoading.value = false
  }
}

// ==================== 窗口自适应 ====================

function handleResize() {
  trendChart?.resize()
  categoryChart?.resize()
}

// ==================== 生命周期 ====================

onMounted(() => {
  fetchData()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  categoryChart?.dispose()
  trendChart = null
  categoryChart = null
})
</script>

<style lang="scss" scoped>
.finance-report {
  .page-header {
    margin-bottom: 16px;

    h2 {
      font-size: 20px;
      font-weight: 600;
      color: #303133;
      margin: 0 0 4px;
    }

    p {
      font-size: 13px;
      color: #909399;
      margin: 0;
    }
  }

  .toolbar-card {
    margin-bottom: 16px;

    :deep(.el-card__body) {
      padding: 0 16px;
    }

    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;

      .report-tabs {
        flex: 1;
        min-width: 0;

        :deep(.el-tabs__header) {
          margin-bottom: 0;
        }

        :deep(.el-tabs__nav-wrap::after) {
          display: none;
        }
      }

      .toolbar-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
      }
    }
  }

  .chart-card {
    margin-bottom: 16px;

    .chart-container {
      width: 100%;
      height: 400px;
    }
  }

  // 收支分析汇总卡片
  .summary-cards {
    margin-bottom: 16px;

    .summary-card {
      text-align: center;

      .summary-label {
        font-size: 13px;
        color: #909399;
        margin-bottom: 8px;
      }

      .summary-value {
        font-size: 22px;
        font-weight: 700;
        color: #303133;

        &.negative {
          color: #f56c6c;
        }
      }

      &.income .summary-value {
        color: #67c23a;
      }

      &.expense .summary-value {
        color: #f56c6c;
      }

      &.profit .summary-value {
        color: #409eff;
      }

      &.avg .summary-value {
        color: #e6a23c;
      }
    }
  }

  // 利润表样式
  :deep(.row-bold) {
    font-weight: 700;
  }

  :deep(.row-highlight) {
    font-weight: 700;
    color: #409eff;
  }

  :deep(.row-bold-bg) {
    background-color: #f5f7fa;
  }

  :deep(.el-table .row-highlight td) {
    background-color: #ecf5ff !important;
  }

  // 现金流量表
  .cashflow-section {
    margin-bottom: 16px;
  }

  .cashflow-card {
    .cashflow-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #ebeef5;
    }

    &.operating .cashflow-title {
      border-color: #409eff;
      color: #409eff;
    }

    &.investing .cashflow-title {
      border-color: #e6a23c;
      color: #e6a23c;
    }

    &.financing .cashflow-title {
      border-color: #67c23a;
      color: #67c23a;
    }

    .cashflow-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;

      .cashflow-label {
        font-size: 13px;
        color: #606266;

        &.net {
          font-weight: 600;
          color: #303133;
        }
      }

      .cashflow-value {
        font-size: 15px;
        font-weight: 600;
        color: #303133;

        &.inflow {
          color: #67c23a;
        }

        &.outflow {
          color: #f56c6c;
        }

        &.net {
          font-size: 17px;
          color: #409eff;
        }

        &.negative {
          color: #f56c6c;
        }
      }
    }

    :deep(.el-divider) {
      margin: 4px 0;
    }
  }

  .cashflow-summary {
    .summary-item {
      text-align: center;

      .summary-label {
        font-size: 13px;
        color: #909399;
        margin-bottom: 6px;
      }

      .summary-value {
        font-size: 20px;
        font-weight: 700;
        color: #303133;

        &.negative {
          color: #f56c6c;
        }
      }
    }
  }

  // 分类对比变动率
  .change-up {
    color: #67c23a;
    font-weight: 500;
  }

  .change-down {
    color: #f56c6c;
    font-weight: 500;
  }
}
</style>
