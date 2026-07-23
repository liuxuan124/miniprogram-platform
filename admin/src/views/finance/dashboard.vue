<template>
  <div class="finance-dashboard">
    <PageHeader
      kicker="财务管理 / 财务概览"
      title="财务概览"
      description="查看收入、支出、利润与发票待办，掌握经营财务健康度。"
    />

    <!-- 顶部统计卡片 -->
    <el-row :gutter="16" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: var(--success)"><el-icon :size="28"><TrendCharts /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">¥{{ (dashboard.totalIncome || 0).toFixed(2) }}</div>
            <div class="stat-label">总收入</div>
            <div class="stat-change" :class="changeClass(dashboard.incomeChange)">
              {{ formatChange(dashboard.incomeChange) }}
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: var(--danger)"><el-icon :size="28"><Minus /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">¥{{ (dashboard.totalExpense || 0).toFixed(2) }}</div>
            <div class="stat-label">总支出</div>
            <div class="stat-change" :class="changeClass(dashboard.expenseChange)">
              {{ formatChange(dashboard.expenseChange) }}
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: #409eff"><el-icon :size="28"><Coin /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value" :class="{ 'profit-negative': (dashboard.netProfit || 0) < 0 }">¥{{ (dashboard.netProfit || 0).toFixed(2) }}</div>
            <div class="stat-label">净利润{{ (dashboard.netProfit || 0) < 0 ? '（亏损）' : '' }}</div>
            <div class="stat-change" :class="profitChangeClass(dashboard.netProfit, dashboard.profitChange)">
              {{ formatChange(dashboard.profitChange) }}
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: var(--warning)"><el-icon :size="28"><Document /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ dashboard.pendingInvoiceCount || 0 }}</div>
            <div class="stat-label">待处理发票</div>
            <div class="stat-change neutral">—</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 收支趋势图 -->
    <el-card shadow="hover" style="margin-bottom: 16px">
      <template #header>
        <div class="card-header">
          <span>收支趋势</span>
          <el-radio-group v-model="trendRange" size="small" @change="fetchTrend">
            <el-radio-button label="7d">近7天</el-radio-button>
            <el-radio-button label="30d">近30天</el-radio-button>
            <el-radio-button label="90d">近90天</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <div v-loading="trendLoading" class="chart-container">
        <div v-if="trendData.length === 0 && !trendLoading" class="empty-chart">暂无数据</div>
        <div v-else ref="trendChartRef" class="chart-box"></div>
      </div>
    </el-card>

    <!-- 分类饼图 -->
    <el-row :gutter="16" style="margin-bottom: 16px">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span>收入分类</span></template>
          <div v-loading="categoryLoading" class="chart-container">
            <div v-if="incomeCategoryData.length === 0 && !categoryLoading" class="empty-chart">暂无数据</div>
            <div v-else ref="incomePieRef" class="chart-box"></div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span>支出分类</span></template>
          <div v-loading="categoryLoading" class="chart-container">
            <div v-if="expenseCategoryData.length === 0 && !categoryLoading" class="empty-chart">暂无数据</div>
            <div v-else ref="expensePieRef" class="chart-box"></div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 预算使用概览 -->
    <el-card shadow="hover" style="margin-bottom: 16px">
      <template #header><span>预算使用概览</span></template>
      <div v-loading="budgetLoading">
        <div v-if="budgetList.length === 0 && !budgetLoading" class="empty-chart">暂无数据</div>
        <div v-else class="budget-list">
          <div v-for="item in budgetList" :key="item.id" class="budget-item">
            <div class="budget-header">
              <span class="budget-name">{{ item.name }}</span>
              <span class="budget-amount">
                ¥{{ (item.usedAmount || 0).toFixed(0) }} / ¥{{ (item.totalBudget || 0).toFixed(0) }}
              </span>
            </div>
            <el-progress
              :percentage="Math.min(item.usageRate || 0, 100)"
              :color="getBudgetColor(item.usageRate)"
              :stroke-width="12"
            />
          </div>
        </div>
      </div>
    </el-card>

    <!-- 最近交易记录 -->
    <el-card shadow="hover" style="margin-bottom: 16px">
      <template #header><span>最近交易</span></template>
      <div v-loading="transactionLoading">
        <div v-if="transactions.length === 0 && !transactionLoading" class="empty-chart">暂无数据</div>
        <el-table v-else :data="transactions" stripe size="small">
          <el-table-column prop="transactionDate" label="日期" width="120" />
          <el-table-column prop="type" label="类型" width="80">
            <template #default="{ row }">
              <el-tag :type="row.type === 'income' ? 'success' : 'danger'" size="small">
                {{ row.type === 'income' ? '收入' : '支出' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="category" label="分类" width="100" />
          <el-table-column prop="description" label="描述" show-overflow-tooltip />
          <el-table-column prop="amount" label="金额" width="120" align="right">
            <template #default="{ row }">
              <span :style="{ color: row.type === 'income' ? 'var(--success)' : 'var(--danger)' }">
                {{ row.type === 'income' ? '+' : '-' }}¥{{ (row.amount || 0).toFixed(2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="approvalStatus" label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag
                :type="row.approvalStatus === 'approved' ? 'success' : row.approvalStatus === 'rejected' ? 'danger' : 'warning'"
                size="small"
              >
                {{ ({ pending: '待审批', approved: '已审批', rejected: '已驳回' } as Record<string, string>)[row.approvalStatus] || row.approvalStatus }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 同步状态 -->
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>数据同步状态</span>
          <el-button size="small" type="primary" :loading="syncing" @click="handleSync">手动同步</el-button>
        </div>
      </template>
      <div v-loading="syncLoading" class="sync-info">
        <div class="sync-item">
          <span class="sync-label">同步来源</span>
          <span class="sync-value">{{ formatSyncSource(syncStatus.syncSource) }}</span>
        </div>
        <div class="sync-item">
          <span class="sync-label">最后同步时间</span>
          <span class="sync-value">{{ syncStatus.lastSyncTime || '—' }}</span>
        </div>
        <div class="sync-item">
          <span class="sync-label">同步状态</span>
          <el-tag
            :type="syncStatusTagType"
            size="small"
          >
            {{ syncStatusLabel }}
          </el-tag>
        </div>
        <div class="sync-item">
          <span class="sync-label">同步记录数</span>
          <span class="sync-value">{{ syncStatus.recordCount ?? '—' }}</span>
        </div>
        <div v-if="syncStatus.errorMessage" class="sync-item">
          <span class="sync-label">错误信息</span>
          <span class="sync-value" style="color: var(--danger)">{{ syncStatus.errorMessage }}</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { TrendCharts, Minus, Coin, Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import PageHeader from '@/components/PageHeader.vue'
import { extractPageRecords } from '@/utils/pagination'
import {
  getFinanceDashboard,
  getFinanceTrend,
  getIncomeCategorySummary,
  getExpenseCategorySummary,
  getTransactionList,
  getBudgetList,
  getSyncStatus,
  triggerSync,
} from '@/api/finance'
import type {
  FinanceDashboard,
  FinanceTrendItem,
  CategorySummary,
  TransactionRecord,
  BudgetRecord,
  SyncStatus,
} from '@/types/finance'

// ==================== 数据状态 ====================

const dashboard = ref<FinanceDashboard>({} as FinanceDashboard)
const trendData = ref<FinanceTrendItem[]>([])
const incomeCategoryData = ref<CategorySummary[]>([])
const expenseCategoryData = ref<CategorySummary[]>([])
const transactions = ref<TransactionRecord[]>([])
const budgetList = ref<BudgetRecord[]>([])
const syncStatus = ref<SyncStatus>({} as SyncStatus)

const trendRange = ref('30d')
const trendLoading = ref(false)
const categoryLoading = ref(false)
const transactionLoading = ref(false)
const budgetLoading = ref(false)
const syncLoading = ref(false)
const syncing = ref(false)

// ==================== 图表引用 ====================

const trendChartRef = ref<HTMLElement>()
const incomePieRef = ref<HTMLElement>()
const expensePieRef = ref<HTMLElement>()

let trendChart: echarts.ECharts | null = null
let incomePieChart: echarts.ECharts | null = null
let expensePieChart: echarts.ECharts | null = null

// ==================== 计算属性 ====================

const syncStatusTagType = computed(() => {
  const map: Record<string, string> = { idle: 'info', syncing: 'warning', success: 'success', failed: 'danger' }
  return map[syncStatus.value.syncStatus] || 'info'
})

const syncStatusLabel = computed(() => {
  const map: Record<string, string> = { idle: '空闲', syncing: '同步中', success: '成功', failed: '失败' }
  return map[syncStatus.value.syncStatus] || '未知'
})

// ==================== 工具方法 ====================

function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getDateRange(days: number) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days + 1)
  return {
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
  }
}

function formatTrendLabel(date: string, granularity: 'day' | 'month'): string {
  if (granularity === 'month') {
    return date
  }
  const parts = date.split('-')
  return parts.length >= 3 ? `${parts[1]}-${parts[2]}` : date
}

function mountChart(container: HTMLElement | undefined, chart: echarts.ECharts | null): echarts.ECharts | null {
  if (!container) return chart
  if (chart) {
    chart.dispose()
  }
  return echarts.init(container)
}

function afterChartRender(chart: echarts.ECharts | null) {
  if (!chart) return
  requestAnimationFrame(() => chart.resize())
}

function getBudgetColor(rate: number): string {
  if (rate >= 90) return '#f56c6c'
  if (rate >= 70) return '#e6a23c'
  return '#67c23a'
}

/** 格式化环比：null 显示 —，否则 ↑/↓ x.x% */
function formatChange(change: number | null | undefined): string {
  if (change === null || change === undefined) return '—'
  const arrow = change >= 0 ? '↑' : '↓'
  return `${arrow} ${Math.abs(Number(change)).toFixed(1)}%`
}

/** 同步来源文案：erp/manual 等映射为中文 */
function formatSyncSource(source: string | null | undefined): string {
  if (!source) return '—'
  const map: Record<string, string> = {
    erp: '业务系统',
    manual: '手动录入',
    wxpay: '微信支付',
    system: '本系统',
  }
  return map[source] || source
}

/** 收入/支出的涨跌样式：收入涨为绿、跌为红；支出涨为红、跌为绿 */
function changeClass(change: number | null | undefined): string {
  if (change === null || change === undefined) return 'neutral'
  return change >= 0 ? 'up' : 'down'
}

/** 净利润环比样式：利润为正时同收入逻辑；利润为负（亏损）时反转——亏损扩大为红，亏损收窄为绿 */
function profitChangeClass(netProfit: number | null | undefined, change: number | null | undefined): string {
  if (change === null || change === undefined) return 'neutral'
  const isLoss = (netProfit || 0) < 0
  if (!isLoss) return change >= 0 ? 'up' : 'down'
  // 亏损状态：change > 0 表示利润增加（亏损收窄，好转）→ 绿；change < 0 表示利润减少（亏损扩大，恶化）→ 红
  return change >= 0 ? 'up' : 'down'
}

// ==================== 数据获取 ====================

async function fetchDashboard() {
  try {
    const res = await getFinanceDashboard()
    dashboard.value = res.data || ({} as FinanceDashboard)
  } catch { /* ignore */ }
}

async function fetchTrend() {
  trendLoading.value = true
  try {
    const days = trendRange.value === '7d' ? 7 : trendRange.value === '90d' ? 90 : 30
    const granularity = trendRange.value === '90d' ? 'month' : 'day'
    const range = getDateRange(days)
    const res = await getFinanceTrend({
      startDate: range.startDate,
      endDate: range.endDate,
      granularity,
    })
    trendData.value = res.data || []
    trendLoading.value = false
    await nextTick()
    renderTrendChart(granularity as 'day' | 'month')
  } catch {
    trendData.value = []
    trendLoading.value = false
  }
}

async function fetchCategorySummary() {
  categoryLoading.value = true
  try {
    const range = getDateRange(30)
    const [incomeRes, expenseRes] = await Promise.all([
      getIncomeCategorySummary({ startDate: range.startDate, endDate: range.endDate }),
      getExpenseCategorySummary({ startDate: range.startDate, endDate: range.endDate }),
    ])
    incomeCategoryData.value = incomeRes.data || []
    expenseCategoryData.value = expenseRes.data || []
    categoryLoading.value = false
    await nextTick()
    renderIncomePie()
    renderExpensePie()
  } catch {
    incomeCategoryData.value = []
    expenseCategoryData.value = []
    categoryLoading.value = false
  }
}

async function fetchTransactions() {
  transactionLoading.value = true
  try {
    const res = await getTransactionList({ page: 1, pageSize: 5 })
    transactions.value = extractPageRecords<TransactionRecord>(res).list
  } catch {
    transactions.value = []
  } finally {
    transactionLoading.value = false
  }
}

async function fetchBudgetList() {
  budgetLoading.value = true
  try {
    const res = await getBudgetList({ page: 1, pageSize: 10 })
    budgetList.value = extractPageRecords<BudgetRecord>(res).list
  } catch {
    budgetList.value = []
  } finally {
    budgetLoading.value = false
  }
}

async function fetchSyncStatus() {
  syncLoading.value = true
  try {
    const res = await getSyncStatus()
    syncStatus.value = res.data || ({} as SyncStatus)
  } catch {
    syncStatus.value = {} as SyncStatus
  } finally {
    syncLoading.value = false
  }
}

async function handleSync() {
  syncing.value = true
  try {
    await triggerSync()
    ElMessage.success('同步已触发')
    await fetchSyncStatus()
  } catch {
    ElMessage.error('同步触发失败')
  } finally {
    syncing.value = false
  }
}

// ==================== 图表渲染 ====================

function renderTrendChart(granularity: 'day' | 'month' = 'day') {
  if (!trendChartRef.value || trendData.value.length === 0) return
  trendChart = mountChart(trendChartRef.value, trendChart)
  const dates = trendData.value.map(i => formatTrendLabel(i.date, granularity))
  const incomes = trendData.value.map(i => Number(i.income) || 0)
  const expenses = trendData.value.map(i => Number(i.expense) || 0)
  const profits = trendData.value.map(i => Number(i.profit) || 0)

  trendChart?.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: { data: ['收入', '支出', '利润'], bottom: 0 },
    grid: { left: 12, right: 12, top: 24, bottom: 48, containLabel: true },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        fontSize: 11,
        interval: granularity === 'day' && dates.length > 14 ? Math.floor(dates.length / 7) : 0,
        rotate: granularity === 'day' && dates.length > 10 ? 35 : 0,
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 11, formatter: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`) },
    },
    series: [
      {
        name: '收入',
        type: 'bar',
        data: incomes,
        itemStyle: { color: '#67c23a' },
        barMaxWidth: 24,
        label: { show: false },
      },
      {
        name: '支出',
        type: 'bar',
        data: expenses,
        itemStyle: { color: '#f56c6c' },
        barMaxWidth: 24,
        label: { show: false },
      },
      {
        name: '利润',
        type: 'line',
        data: profits,
        smooth: true,
        itemStyle: { color: '#409eff' },
        lineStyle: { width: 2 },
        symbolSize: 6,
        label: { show: false },
      },
    ],
  }, true)
  afterChartRender(trendChart)
}

function renderIncomePie() {
  if (!incomePieRef.value || incomeCategoryData.value.length === 0) return
  incomePieChart = mountChart(incomePieRef.value, incomePieChart)
  incomePieChart?.setOption({
    color: ['#67c23a', '#409eff', '#e6a23c', '#909399', '#f56c6c'],
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { fontSize: 12 } },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}\n{d}%', fontSize: 12 },
        data: incomeCategoryData.value.map(i => ({
          name: i.category || '未分类',
          value: Number(i.amount) || 0,
        })),
      },
    ],
  }, true)
  afterChartRender(incomePieChart)
}

function renderExpensePie() {
  if (expensePieChart) {
    expensePieChart.dispose()
    expensePieChart = null
  }
  if (!expensePieRef.value || expenseCategoryData.value.length === 0) return
  expensePieChart = mountChart(expensePieRef.value, null)
  expensePieChart?.setOption({
    color: ['#f56c6c', '#e6a23c', '#909399', '#409eff', '#67c23a'],
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { fontSize: 12 } },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}\n{d}%', fontSize: 12 },
        data: expenseCategoryData.value.map(i => ({
          name: i.category || '未分类',
          value: Number(i.amount) || 0,
        })),
      },
    ],
  }, true)
  afterChartRender(expensePieChart)
}

function handleResize() {
  trendChart?.resize()
  incomePieChart?.resize()
  expensePieChart?.resize()
}

// ==================== 生命周期 ====================

onMounted(() => {
  fetchDashboard()
  fetchTrend()
  fetchCategorySummary()
  fetchTransactions()
  fetchBudgetList()
  fetchSyncStatus()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  incomePieChart?.dispose()
  expensePieChart?.dispose()
  trendChart = null
  incomePieChart = null
  expensePieChart = null
})
</script>

<style lang="scss" scoped>
.finance-dashboard {
  .stat-cards {
    margin-bottom: 16px;
  }

  .stat-card {
    :deep(.el-card__body) {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      flex-shrink: 0;
    }

    .stat-info {
      .stat-value {
        font-size: 24px;
        font-weight: 700;
        color: var(--text);
        &.profit-negative { color: var(--danger); }
      }
      .stat-label {
        font-size: 13px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .stat-change {
        font-size: 12px;
        margin-top: 2px;
        &.up { color: var(--success); }
        &.down { color: var(--danger); }
        &.neutral { color: var(--text-muted); }
      }
    }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .chart-container {
    min-height: 300px;
    position: relative;
  }

  .chart-box {
    width: 100%;
    height: 300px;
  }

  .empty-chart {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 300px;
    color: var(--text-muted);
    font-size: 14px;
  }

  .budget-list {
    .budget-item {
      margin-bottom: 16px;

      &:last-child {
        margin-bottom: 0;
      }

      .budget-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;

        .budget-name {
          font-size: 14px;
          color: var(--text);
          font-weight: 500;
        }

        .budget-amount {
          font-size: 13px;
          color: var(--text-secondary);
        }
      }
    }
  }

  .sync-info {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;

    .sync-item {
      display: flex;
      align-items: center;
      gap: 8px;

      .sync-label {
        font-size: 13px;
        color: var(--text-muted);
      }

      .sync-value {
        font-size: 13px;
        color: var(--text);
      }
    }
  }
}
</style>
