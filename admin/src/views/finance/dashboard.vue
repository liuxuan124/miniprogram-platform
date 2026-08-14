<template>
  <div class="finance-dashboard">
    <PageHeader
      kicker="财务管理 / 财务概览"
      title="财务概览"
      description="本月已审批收支与环比、分类结构、预算占用与待办发票一览。"
    />

    <!-- 顶部统计卡片：本月口径，环比为较上月 -->
    <el-row :gutter="16" class="stat-cards">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: var(--success)"><el-icon :size="28"><TrendCharts /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">¥{{ formatMoney(dashboard.totalIncome) }}</div>
            <div class="stat-label">本月收入</div>
            <div class="stat-change" :class="incomeChangeClass(dashboard.incomeChange)">
              较上月 {{ formatChange(dashboard.incomeChange) }}
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: var(--danger)"><el-icon :size="28"><Minus /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">¥{{ formatMoney(dashboard.totalExpense) }}</div>
            <div class="stat-label">本月支出</div>
            <div class="stat-change" :class="expenseChangeClass(dashboard.expenseChange)">
              较上月 {{ formatChange(dashboard.expenseChange) }}
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: #409eff"><el-icon :size="28"><Coin /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value" :class="{ 'profit-negative': (dashboard.netProfit || 0) < 0 }">
              ¥{{ formatMoney(dashboard.netProfit) }}
            </div>
            <div class="stat-label">本月净利润{{ (dashboard.netProfit || 0) < 0 ? '（亏损）' : '' }}</div>
            <div class="stat-change" :class="profitChangeClass(dashboard.netProfit, dashboard.profitChange)">
              较上月 {{ formatChange(dashboard.profitChange) }}
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card stat-card--clickable" @click="goInvoice">
          <div class="stat-icon" style="background: var(--warning)"><el-icon :size="28"><Document /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ dashboard.pendingInvoiceCount || 0 }}</div>
            <div class="stat-label">待处理发票</div>
            <div class="stat-change neutral">
              活跃预算均用 {{ formatPercent(dashboard.budgetUsageRate) }}
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 收支趋势图 -->
    <el-card shadow="hover" style="margin-bottom: 16px">
      <template #header>
        <div class="card-header">
          <span>收支趋势</span>
          <el-radio-group v-model="trendRange" size="small" @change="onRangeChange">
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

    <!-- 分类饼图（与趋势同一时间范围） -->
    <el-row :gutter="16" style="margin-bottom: 16px">
      <el-col :xs="24" :md="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>收入分类 · {{ rangeLabel }}</span>
            </div>
          </template>
          <div v-loading="categoryLoading" class="chart-container">
            <div v-if="incomeCategoryData.length === 0 && !categoryLoading" class="empty-chart">暂无数据</div>
            <div v-else ref="incomePieRef" class="chart-box"></div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>支出分类 · {{ rangeLabel }}</span>
            </div>
          </template>
          <div v-loading="categoryLoading" class="chart-container">
            <div v-if="expenseCategoryData.length === 0 && !categoryLoading" class="empty-chart">暂无数据</div>
            <div v-else ref="expensePieRef" class="chart-box"></div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 预算使用概览 -->
    <el-card shadow="hover" style="margin-bottom: 16px">
      <template #header>
        <div class="card-header">
          <span>预算使用概览</span>
          <el-button link type="primary" @click="goBudget">查看全部</el-button>
        </div>
      </template>
      <div v-loading="budgetLoading">
        <div v-if="budgetList.length === 0 && !budgetLoading" class="empty-chart">暂无活跃预算</div>
        <div v-else class="budget-list">
          <div v-for="item in budgetList" :key="item.id" class="budget-item">
            <div class="budget-header">
              <span class="budget-name">{{ item.name }}</span>
              <span class="budget-amount">
                ¥{{ formatMoney(item.usedAmount, 0) }} / ¥{{ formatMoney(item.totalBudget, 0) }}
              </span>
            </div>
            <el-progress
              :percentage="Math.min(Number(item.usageRate) || 0, 100)"
              :color="getBudgetColor(Number(item.usageRate) || 0)"
              :stroke-width="12"
            />
          </div>
        </div>
      </div>
    </el-card>

    <!-- 最近交易记录 -->
    <el-card shadow="hover" style="margin-bottom: 16px">
      <template #header>
        <div class="card-header">
          <span>最近交易</span>
          <el-button link type="primary" @click="goTransactions">查看全部</el-button>
        </div>
      </template>
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
          <el-table-column prop="amount" label="金额" width="140" align="right">
            <template #default="{ row }">
              <span :style="{ color: row.type === 'income' ? 'var(--success)' : 'var(--danger)' }">
                {{ row.type === 'income' ? '+' : '-' }}¥{{ formatMoney(row.amount) }}
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
          <el-button size="small" type="primary" :loading="syncing" @click="handleSync">刷新本地数据</el-button>
        </div>
      </template>
      <el-alert
        v-if="syncStatus.syncHint"
        :title="syncStatus.syncHint"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 12px"
      />
      <div v-loading="syncLoading" class="sync-info">
        <div class="sync-item">
          <span class="sync-label">同步来源</span>
          <span class="sync-value">{{ formatSyncSource(syncStatus.syncSource) }}</span>
        </div>
        <div class="sync-item">
          <span class="sync-label">最后刷新时间</span>
          <span class="sync-value">{{ syncStatus.lastSyncTime || '—' }}</span>
        </div>
        <div class="sync-item">
          <span class="sync-label">状态</span>
          <el-tag :type="syncStatusTagType" size="small">
            {{ syncStatusLabel }}
          </el-tag>
        </div>
        <div class="sync-item">
          <span class="sync-label">记录数</span>
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
import { useRouter } from 'vue-router'
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

const router = useRouter()

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

const trendChartRef = ref<HTMLElement>()
const incomePieRef = ref<HTMLElement>()
const expensePieRef = ref<HTMLElement>()

let trendChart: echarts.ECharts | null = null
let incomePieChart: echarts.ECharts | null = null
let expensePieChart: echarts.ECharts | null = null

const rangeLabel = computed(() => {
  if (trendRange.value === '7d') return '近7天'
  if (trendRange.value === '90d') return '近90天'
  return '近30天'
})

const syncStatusTagType = computed(() => {
  const map: Record<string, string> = { idle: 'info', syncing: 'warning', success: 'success', failed: 'danger' }
  return map[syncStatus.value.syncStatus] || 'info'
})

const syncStatusLabel = computed(() => {
  const map: Record<string, string> = { idle: '空闲', syncing: '同步中', success: '成功', failed: '失败' }
  return map[syncStatus.value.syncStatus] || '未知'
})

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

function currentRangeDays(): number {
  return trendRange.value === '7d' ? 7 : trendRange.value === '90d' ? 90 : 30
}

function formatMoney(value: number | null | undefined, digits = 2): string {
  const n = Number(value) || 0
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `${Number(value).toFixed(1)}%`
}

function formatTrendLabel(date: string, granularity: 'day' | 'month'): string {
  if (granularity === 'month') return date
  const parts = date.split('-')
  return parts.length >= 3 ? `${parts[1]}-${parts[2]}` : date
}

function mountChart(container: HTMLElement | undefined, chart: echarts.ECharts | null): echarts.ECharts | null {
  if (!container) return chart
  if (chart) chart.dispose()
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

function formatChange(change: number | null | undefined): string {
  if (change === null || change === undefined) return '—'
  const arrow = change >= 0 ? '↑' : '↓'
  return `${arrow} ${Math.abs(Number(change)).toFixed(1)}%`
}

function formatSyncSource(source: string | null | undefined): string {
  if (!source) return '—'
  const map: Record<string, string> = {
    erp: '业务系统',
    manual: '手动录入',
    wxpay: '微信支付',
    system: '本系统',
    bank: '银行流水',
    tax: '税务发票',
  }
  return map[source] || source
}

/** 收入：涨绿跌红 */
function incomeChangeClass(change: number | null | undefined): string {
  if (change === null || change === undefined) return 'neutral'
  return change >= 0 ? 'up' : 'down'
}

/** 支出：涨红跌绿（支出增加不利） */
function expenseChangeClass(change: number | null | undefined): string {
  if (change === null || change === undefined) return 'neutral'
  return change >= 0 ? 'down' : 'up'
}

/** 利润：涨绿跌红；亏损时同理（利润上升=好转） */
function profitChangeClass(netProfit: number | null | undefined, change: number | null | undefined): string {
  if (change === null || change === undefined) return 'neutral'
  return change >= 0 ? 'up' : 'down'
}

function goInvoice() {
  router.push('/finance/invoice')
}

function goBudget() {
  router.push('/finance/budget')
}

function goTransactions() {
  router.push('/finance/income-expense')
}

async function fetchDashboard() {
  try {
    const res = await getFinanceDashboard()
    dashboard.value = res.data || ({} as FinanceDashboard)
  } catch {
    ElMessage.error('加载财务概览失败')
  }
}

async function fetchTrend() {
  trendLoading.value = true
  try {
    const days = currentRangeDays()
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
    ElMessage.error('加载收支趋势失败')
  }
}

async function fetchCategorySummary() {
  categoryLoading.value = true
  try {
    const range = getDateRange(currentRangeDays())
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
    ElMessage.error('加载分类汇总失败')
  }
}

function onRangeChange() {
  fetchTrend()
  fetchCategorySummary()
}

async function fetchTransactions() {
  transactionLoading.value = true
  try {
    const res = await getTransactionList({ page: 1, pageSize: 5 })
    transactions.value = extractPageRecords<TransactionRecord>(res).list
  } catch {
    transactions.value = []
    ElMessage.error('加载最近交易失败')
  } finally {
    transactionLoading.value = false
  }
}

async function fetchBudgetList() {
  budgetLoading.value = true
  try {
    const res = await getBudgetList({ page: 1, pageSize: 10, status: 'active' })
    budgetList.value = extractPageRecords<BudgetRecord>(res).list
  } catch {
    budgetList.value = []
    ElMessage.error('加载预算概览失败')
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
    ElMessage.error('加载同步状态失败')
  } finally {
    syncLoading.value = false
  }
}

async function handleSync() {
  syncing.value = true
  try {
    await triggerSync()
    ElMessage.success('已刷新本地汇总（未对接外部入账）')
    await Promise.all([fetchSyncStatus(), fetchDashboard(), fetchBudgetList()])
  } catch {
    ElMessage.error('刷新失败')
  } finally {
    syncing.value = false
  }
}

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
      axisLabel: {
        fontSize: 11,
        formatter: (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`),
      },
    },
    series: [
      {
        name: '收入',
        type: 'bar',
        data: incomes,
        itemStyle: { color: '#67c23a' },
        barMaxWidth: 24,
      },
      {
        name: '支出',
        type: 'bar',
        data: expenses,
        itemStyle: { color: '#f56c6c' },
        barMaxWidth: 24,
      },
      {
        name: '利润',
        type: 'line',
        data: profits,
        smooth: true,
        itemStyle: { color: '#409eff' },
        lineStyle: { width: 2 },
        symbolSize: 6,
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
  if (!expensePieRef.value || expenseCategoryData.value.length === 0) {
    if (expensePieChart) {
      expensePieChart.dispose()
      expensePieChart = null
    }
    return
  }
  expensePieChart = mountChart(expensePieRef.value, expensePieChart)
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

    .el-col {
      margin-bottom: 16px;
    }
  }

  .stat-card {
    :deep(.el-card__body) {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    &--clickable {
      cursor: pointer;
      transition: box-shadow 0.2s;
      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }
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
      min-width: 0;

      .stat-value {
        font-size: 22px;
        font-weight: 700;
        color: var(--text);
        word-break: break-all;
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
    gap: 12px;
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
        gap: 12px;

        .budget-name {
          font-size: 14px;
          color: var(--text);
          font-weight: 500;
        }

        .budget-amount {
          font-size: 13px;
          color: var(--text-secondary);
          flex-shrink: 0;
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
