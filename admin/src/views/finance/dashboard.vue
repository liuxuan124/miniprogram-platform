<template>
  <div class="finance-dashboard">
    <!-- 顶部统计卡片 -->
    <el-row :gutter="16" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: #67c23a"><el-icon :size="28"><TrendCharts /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">¥{{ (dashboard.totalIncome || 0).toFixed(2) }}</div>
            <div class="stat-label">总收入</div>
            <div class="stat-change" :class="dashboard.incomeChange >= 0 ? 'up' : 'down'">
              {{ dashboard.incomeChange >= 0 ? '↑' : '↓' }} {{ Math.abs(dashboard.incomeChange || 0).toFixed(1) }}%
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: #f56c6c"><el-icon :size="28"><Minus /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">¥{{ (dashboard.totalExpense || 0).toFixed(2) }}</div>
            <div class="stat-label">总支出</div>
            <div class="stat-change" :class="dashboard.expenseChange >= 0 ? 'up' : 'down'">
              {{ dashboard.expenseChange >= 0 ? '↑' : '↓' }} {{ Math.abs(dashboard.expenseChange || 0).toFixed(1) }}%
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: #409eff"><el-icon :size="28"><Coin /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">¥{{ (dashboard.netProfit || 0).toFixed(2) }}</div>
            <div class="stat-label">净利润</div>
            <div class="stat-change" :class="dashboard.profitChange >= 0 ? 'up' : 'down'">
              {{ dashboard.profitChange >= 0 ? '↑' : '↓' }} {{ Math.abs(dashboard.profitChange || 0).toFixed(1) }}%
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: #e6a23c"><el-icon :size="28"><Document /></el-icon></div>
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
              <span :style="{ color: row.type === 'income' ? '#67c23a' : '#f56c6c' }">
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
          <span class="sync-value">{{ syncStatus.syncSource || '—' }}</span>
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
          <span class="sync-value" style="color: #f56c6c">{{ syncStatus.errorMessage }}</span>
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

function getDateRange(days: number) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

function getBudgetColor(rate: number): string {
  if (rate >= 90) return '#f56c6c'
  if (rate >= 70) return '#e6a23c'
  return '#67c23a'
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
    const range = getDateRange(days)
    const res = await getFinanceTrend({ startDate: range.startDate, endDate: range.endDate })
    trendData.value = res.data || []
    await nextTick()
    renderTrendChart()
  } catch {
    trendData.value = []
  } finally {
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
    await nextTick()
    renderIncomePie()
    renderExpensePie()
  } catch {
    incomeCategoryData.value = []
    expenseCategoryData.value = []
  } finally {
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

function renderTrendChart() {
  if (!trendChartRef.value || trendData.value.length === 0) return
  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value)
  }
  const dates = trendData.value.map(i => i.date)
  const incomes = trendData.value.map(i => i.income)
  const expenses = trendData.value.map(i => i.expense)
  const profits = trendData.value.map(i => i.profit)

  trendChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { data: ['收入', '支出', '利润'], bottom: 0 },
    grid: { left: 60, right: 30, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
    series: [
      {
        name: '收入',
        type: 'bar',
        data: incomes,
        itemStyle: { color: '#67c23a' },
        barMaxWidth: 20,
      },
      {
        name: '支出',
        type: 'bar',
        data: expenses,
        itemStyle: { color: '#f56c6c' },
        barMaxWidth: 20,
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
  })
}

function renderIncomePie() {
  if (!incomePieRef.value || incomeCategoryData.value.length === 0) return
  if (!incomePieChart) {
    incomePieChart = echarts.init(incomePieRef.value)
  }
  incomePieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { fontSize: 12 } },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}\n{d}%', fontSize: 12 },
        data: incomeCategoryData.value.map(i => ({ name: i.category, value: i.amount })),
      },
    ],
  })
}

function renderExpensePie() {
  if (!expensePieRef.value || expenseCategoryData.value.length === 0) return
  if (!expensePieChart) {
    expensePieChart = echarts.init(expensePieRef.value)
  }
  expensePieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { fontSize: 12 } },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}\n{d}%', fontSize: 12 },
        data: expenseCategoryData.value.map(i => ({ name: i.category, value: i.amount })),
      },
    ],
  })
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
        color: #303133;
      }
      .stat-label {
        font-size: 13px;
        color: #909399;
        margin-top: 2px;
      }
      .stat-change {
        font-size: 12px;
        margin-top: 2px;
        &.up { color: #67c23a; }
        &.down { color: #f56c6c; }
        &.neutral { color: #909399; }
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
    color: #c0c4cc;
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
          color: #303133;
          font-weight: 500;
        }

        .budget-amount {
          font-size: 13px;
          color: #606266;
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
        color: #909399;
      }

      .sync-value {
        font-size: 13px;
        color: #303133;
      }
    }
  }
}
</style>
