<template>
  <div class="commerce-wb mw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">经营概览</h1>
        <div class="sub">{{ monthLabel }} · 一个人的账：收入、成本、净利和目标进度</div>
      </div>
      <div class="actions">
        <button type="button" class="btn sm" @click="exportAccounting">导出给会计</button>
      </div>
    </div>

    <div class="tiles">
      <div v-for="t in tiles" :key="t.label" class="tile">
        <span class="faint">{{ t.label }}</span>
        <b>{{ t.value }}</b>
        <span class="faint">{{ t.hint }}</span>
      </div>
    </div>

    <div v-if="!dash.ordersAligned" class="hint warn">
      <span>
        <b>财务和订单对不上</b>：订单系统 {{ dash.orderTotalCount ?? '—' }} 笔订单，财务只入账了
        {{ dash.syncedOrderTransactionCount ?? 0 }} 笔，上次对账 {{ dash.lastOrderSyncTime || '尚未对账' }}。有
        {{ dash.pendingOrderCount ?? 0 }} 笔已付款订单没入账。
      </span>
      <button type="button" class="btn sm primary" :disabled="syncing" @click="confirmSyncAll">立即对账</button>
    </div>
    <div v-else class="hint ok">
      <span>订单与财务已对齐{{ dash.lastOrderSyncTime ? `，最近一次对账：${dash.lastOrderSyncTime}` : '' }}。</span>
    </div>

    <div class="ov2">
      <section class="card">
        <h2 class="h2">本月目标</h2>
        <div class="sub">收入目标 ¥{{ formatYuan(dash.goalMonth) }} · 已完成 {{ goalPct }}%</div>
        <div class="lvbar tall"><div :style="{ width: `${goalPct}%` }" /></div>
        <div class="faint" style="margin-top: 8px">
          按当前进度，本月预计 ¥{{ formatYuan(projectedMonth) }}；离目标还差 ¥{{ formatYuan(goalGap) }}
        </div>
        <div style="margin-top: 16px">
          <div class="faint">近 6 个月收支</div>
          <div class="mbars">
            <div v-for="b in sixMonthBars" :key="b.label" class="mbar">
              <span class="mb-in" :style="{ height: `${b.inH}px` }" :title="`收入 ${formatYuan(b.income)}`" />
              <span class="mb-ex" :style="{ height: `${b.exH}px` }" :title="`支出 ${formatYuan(b.expense)}`" />
              <em>{{ b.label }}</em>
            </div>
          </div>
          <div class="faint leg">
            <span><i class="dot-in" />收入</span>
            <span><i class="dot-ex" />支出</span>
          </div>
        </div>
      </section>

      <section class="card">
        <h2 class="h2">钱从哪来</h2>
        <div class="sub">本月收入按来源</div>
        <div class="bars">
          <template v-if="incomeCats.length">
            <div v-for="c in incomeCats" :key="c.category" class="bar-row">
              <span class="bar-name">{{ c.category }}</span>
              <div class="bar-track"><div class="bar-fill" :style="{ width: `${c.pct}%` }" /></div>
              <span class="bar-val">¥{{ formatYuan(c.amount) }}</span>
            </div>
          </template>
          <div v-else class="faint">本月还没有收入入账</div>
        </div>
        <div class="faint" style="margin-top: 14px">
          已排除测试订单和 ¥0 的免费领取，口径与「商业变现 → 收入概览」一致
        </div>
      </section>
    </div>

    <div class="ov2">
      <section class="card">
        <h2 class="h2">待办</h2>
        <div style="margin-top: 8px">
          <button
            v-for="td in todos"
            :key="td.key"
            type="button"
            class="list-row linkish"
            @click="goTodo(td.to)"
          >
            <span style="flex: 1">{{ td.label }}</span>
            <b>{{ td.count }}</b>
          </button>
        </div>
      </section>
      <section class="card">
        <h2 class="h2">这个月花在哪</h2>
        <div style="margin-top: 8px">
          <div v-for="e in expenseRows" :key="e.category" class="list-row">
            <span style="flex: 1">{{ e.category }}</span>
            <b>¥{{ formatYuan(e.amount) }}</b>
          </div>
          <div v-if="!expenseRows.length" class="faint">本月还没有记支出</div>
        </div>
        <button type="button" class="btn sm" style="margin-top: 10px" @click="router.push('/finance/transactions')">
          记一笔支出
        </button>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getFinanceDashboard,
  getIncomeCategorySummary,
  getExpenseCategorySummary,
  getFinanceTrend,
  syncAllPendingOrders,
  exportReport,
} from '@/api/finance'
import type { FinanceDashboard, CategorySummary, FinanceTrendItem } from '@/types/finance'
import { formatYuan } from '@/utils/financeMoney'

defineOptions({ name: 'FinanceOpsOverview' })

const router = useRouter()
const loading = ref(false)
const syncing = ref(false)
const dash = ref<FinanceDashboard>({} as FinanceDashboard)
const incomeCats = ref<(CategorySummary & { pct: number })[]>([])
const expenseRows = ref<CategorySummary[]>([])
const sixMonthBars = ref<{ label: string; income: number; expense: number; inH: number; exH: number }[]>([])

const now = new Date()
const monthLabel = `${now.getMonth() + 1} 月`

const tiles = computed(() => {
  const d = dash.value
  const prev = d.previousMonthIncome
  const incomeHint = d.showIncomeChange && d.incomeChange != null
    ? `较上月 ${d.incomeChange > 0 ? '↑' : '↓'}${Math.abs(Number(d.incomeChange))}%`
    : prev && Number(prev) > 0
      ? `上月 ¥${formatYuan(prev)}`
      : '上月无收入或基数过小，不展示环比'
  return [
    { label: '本月收入', value: `¥${formatYuan(d.totalIncome)}`, hint: incomeHint },
    { label: '本月支出', value: `¥${formatYuan(d.totalExpense)}`, hint: '含订阅、外包、推广' },
    {
      label: '本月净利',
      value: `¥${formatYuan(d.netProfit)}`,
      hint: Number(d.netProfit) >= 0 ? '盈利' : '亏损',
    },
    {
      label: '未入账订单',
      value: `${d.pendingOrderCount ?? 0} 笔`,
      hint: `共 ¥${formatYuan(d.pendingOrderAmount)}`,
    },
  ]
})

const goalPct = computed(() => {
  const goal = Number(dash.value.goalMonth) || 0
  const cur = Number(dash.value.totalIncome) || 0
  if (goal <= 0) return 0
  return Math.min(100, Math.round((cur / goal) * 100))
})

const projectedMonth = computed(() => {
  const cur = Number(dash.value.totalIncome) || 0
  const day = now.getDate() || 1
  return (cur / day) * 30
})

const goalGap = computed(() => Math.max(0, (Number(dash.value.goalMonth) || 0) - (Number(dash.value.totalIncome) || 0)))

const todos = computed(() => [
  { key: 'pending', label: '未入账订单', count: dash.value.pendingOrderCount ?? 0, to: '/finance/transactions?tab=pending' },
  { key: 'inv', label: '待开发票', count: dash.value.pendingInvoiceCount ?? 0, to: '/finance/invoice?tab=req' },
  { key: 'bdg', label: '重复预算', count: dash.value.duplicateBudgetCount ?? 0, to: '/finance/budget' },
  { key: 'invdup', label: '重复 / 示例发票', count: dash.value.duplicateInvoiceCount ?? 0, to: '/finance/invoice?tab=list' },
])

function goTodo(path: string) {
  router.push(path)
}

async function confirmSyncAll() {
  try {
    await ElMessageBox.confirm(
      `把 ${dash.value.pendingOrderCount ?? 0} 笔未入账订单写入收支流水？入账后概览与预算占用会更新。`,
      '全部入账',
      { type: 'warning' },
    )
  } catch {
    return
  }
  syncing.value = true
  try {
    const res = await syncAllPendingOrders()
    const n = (res as any)?.data?.synced ?? (res as any)?.synced ?? 0
    ElMessage.success(`已入账 ${n} 笔`)
    await load()
  } catch (e: any) {
    ElMessage.error(e?.message || '入账失败')
  } finally {
    syncing.value = false
  }
}

async function exportAccounting() {
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const end = start.slice(0, 8) + String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')
  try {
    await exportReport({
      reportType: 'income_expense',
      startDate: start,
      endDate: end,
      format: 'csv',
    })
    ElMessage.success('已开始导出（请查看浏览器下载）')
  } catch {
    ElMessage.info('导出请求已发送')
  }
}

function monthRange(monthsBack: number) {
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const start = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1)
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  return { start: fmt(start), end: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}` }
}

async function load() {
  loading.value = true
  try {
    const { start, end } = monthRange(6)
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const monthEnd = end
    const [dRes, inc, exp, trendRes] = await Promise.all([
      getFinanceDashboard(),
      getIncomeCategorySummary({ startDate: monthStart, endDate: monthEnd }),
      getExpenseCategorySummary({ startDate: monthStart, endDate: monthEnd }),
      getFinanceTrend({ startDate: start, endDate: end, granularity: 'month' }),
    ])
    dash.value = (dRes as any)?.data ?? dRes
    const incList = ((inc as any)?.data ?? inc ?? []) as CategorySummary[]
    const max = Math.max(1, ...incList.map((x) => Number(x.amount) || 0))
    incomeCats.value = incList.map((x) => ({ ...x, pct: Math.max(4, ((Number(x.amount) || 0) / max) * 100) }))
    expenseRows.value = ((exp as any)?.data ?? exp ?? []) as CategorySummary[]
    const trend = ((trendRes as any)?.data ?? trendRes ?? []) as FinanceTrendItem[]
    const bmax = Math.max(1, ...trend.map((t) => Math.max(Number(t.income) || 0, Number(t.expense) || 0)))
    sixMonthBars.value = trend.map((t) => ({
      label: t.date?.slice(5) ? `${Number(t.date.slice(5))}月` : t.date,
      income: Number(t.income) || 0,
      expense: Number(t.expense) || 0,
      inH: Math.round(((Number(t.income) || 0) / bmax) * 72),
      exH: Math.round(((Number(t.expense) || 0) / bmax) * 72),
    }))
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.hint {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 13px;
  flex-wrap: wrap;
  &.warn {
    background: var(--rs);
    color: var(--r);
  }
  &.ok {
    background: var(--gs);
    color: var(--g);
  }
  span {
    flex: 1;
    min-width: 200px;
  }
}
.lvbar {
  height: 10px;
  border-radius: 5px;
  background: var(--ns);
  overflow: hidden;
  &.tall {
    height: 14px;
    margin-top: 14px;
  }
  div {
    height: 100%;
    background: var(--acc);
    border-radius: 5px;
  }
}
.mbars {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  margin-top: 10px;
  min-height: 80px;
}
.mbar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  em {
    font-style: normal;
    font-size: 11px;
    color: var(--faint);
  }
}
.mb-in,
.mb-ex {
  width: 14px;
  border-radius: 3px 3px 0 0;
  display: block;
}
.mb-in {
  background: var(--g);
}
.mb-ex {
  background: var(--acc);
}
.leg {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  .dot-in,
  .dot-ex {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 2px;
    margin-right: 4px;
    vertical-align: -1px;
  }
  .dot-in {
    background: var(--g);
  }
  .dot-ex {
    background: var(--acc);
  }
}
.list-row.linkish {
  width: 100%;
  border: 0;
  background: none;
  text-align: left;
  cursor: pointer;
  padding: 10px 0;
  border-bottom: 1px solid var(--line2);
  &:last-child {
    border-bottom: 0;
  }
  &:hover b {
    color: var(--acc);
  }
}
</style>
