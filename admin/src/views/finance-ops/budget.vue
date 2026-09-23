<template>
  <div class="commerce-wb mw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">预算与目标</h1>
        <div class="sub">先定目标，再管成本；超支和掉队都会在概览里提醒</div>
      </div>
      <div class="actions">
        <button type="button" class="btn primary" @click="createBudget">新建预算</button>
      </div>
    </div>

    <div v-if="dupCount > 0" class="hint warn">
      <span
        ><b>有 {{ dupCount }} 条完全重复的预算</b>（同名、同周期、同金额，都是草稿），多半是初始化时重复写入的。</span
      >
      <button type="button" class="btn sm primary" @click="confirmDedupe">清理重复</button>
    </div>

    <div class="ov2">
      <section class="card">
        <h2 class="h2">收入目标</h2>
        <div class="sub">目标是给自己定的，不是系统默认</div>
        <div class="row goals">
          <div class="field">
            <label>月度收入目标（元）</label>
            <el-input-number v-model="goalMonthYuan" :min="0" :step="100" />
          </div>
          <div class="field">
            <label>年度收入目标（元）</label>
            <el-input-number v-model="goalYearYuan" :min="0" :step="1000" />
          </div>
        </div>
        <button type="button" class="btn sm primary" style="margin-top: 12px" @click="saveGoals">保存目标</button>
      </section>
    </div>

    <section class="card" style="margin-top: 16px">
      <h2 class="h2">预算列表</h2>
      <div class="sub">周期显示为「年度 / 季度 / 月度」，不再显示 yearly 这类原始值</div>
      <div class="group cardish" style="margin-top: 8px">
        <div v-for="b in budgets" :key="b.id" class="crow">
          <div class="cmain">
            <b>{{ b.name }}</b>
            <div class="cmeta">
              <span>{{ labelBudgetPeriod(b.period) }}</span>
              <span>{{ b.startDate }} ~ {{ b.endDate }}</span>
              <span class="tag" :class="b.status === 'active' ? 't-live' : 't-draft'">{{ labelBudgetStatus(b.status) }}</span>
            </div>
            <div class="lvbar"><div :style="{ width: `${Math.min(100, Number(b.usageRate) || 0)}%` }" /></div>
          </div>
          <div class="c-num faint">¥{{ formatYuan(b.usedAmount) }} / ¥{{ formatYuan(b.totalBudget) }}</div>
          <button v-if="b.status === 'draft'" type="button" class="btn sm primary" @click="activate(b.id)">启用</button>
        </div>
        <div v-if="!budgets.length" class="muted pad">还没有预算，可新建一条草稿</div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getBudgetList,
  createBudget as apiCreateBudget,
  activateBudget,
  getFinanceGoals,
  saveFinanceGoals,
  dedupeBudgets,
  getFinanceDashboard,
} from '@/api/finance'
import type { BudgetRecord } from '@/types/finance'
import { formatYuan, yuanToCents } from '@/utils/financeMoney'
import { labelBudgetPeriod, labelBudgetStatus } from '@/utils/financeLabels'

defineOptions({ name: 'FinanceOpsBudget' })

const loading = ref(false)
const budgets = ref<BudgetRecord[]>([])
const dupCount = ref(0)
const goalMonthYuan = ref(6000)
const goalYearYuan = ref(60000)

async function load() {
  loading.value = true
  try {
    const [bRes, gRes, dRes] = await Promise.all([
      getBudgetList({ page: 1, pageSize: 50 }),
      getFinanceGoals(),
      getFinanceDashboard(),
    ])
    const data = (bRes as any)?.data
    budgets.value = data?.records ?? data?.list ?? []
    dupCount.value = Number((dRes as any)?.data?.duplicateBudgetCount ?? (dRes as any)?.duplicateBudgetCount ?? 0)
    const g = (gRes as any)?.data ?? gRes
    goalMonthYuan.value = (g?.goalMonthCents ?? 600000) / 100
    goalYearYuan.value = (g?.goalYearCents ?? 6000000) / 100
  } finally {
    loading.value = false
  }
}

async function saveGoals() {
  await saveFinanceGoals({
    goalMonthCents: yuanToCents(goalMonthYuan.value),
    goalYearCents: yuanToCents(goalYearYuan.value),
  })
  ElMessage.success('已保存目标')
}

async function confirmDedupe() {
  try {
    await ElMessageBox.confirm('保留最早的一条，其余删除。它们都是草稿，没有实际占用。', '清理重复预算', {
      type: 'warning',
    })
  } catch {
    return
  }
  const res = await dedupeBudgets()
  ElMessage.success(`已清理 ${(res as any)?.data?.removed ?? 0} 条`)
  await load()
}

async function activate(id: number) {
  await activateBudget(id)
  ElMessage.success('已启用，支出会开始占用这个预算')
  await load()
}

async function createBudget() {
  const y = new Date().getFullYear()
  await apiCreateBudget({
    name: `${y} 运营预算`,
    period: 'yearly',
    startDate: `${y}-01-01`,
    endDate: `${y}-12-31`,
    totalBudget: 100000,
    status: 'draft',
  } as any)
  ElMessage.success('已新建草稿预算')
  await load()
}

onMounted(load)
</script>

<style scoped lang="scss">
.hint.warn {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--rs);
  color: var(--r);
  margin-bottom: 12px;
  span {
    flex: 1;
  }
}
.goals {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 12px;
}
.field label {
  display: block;
  font-size: 13px;
  margin-bottom: 6px;
}
.lvbar {
  height: 8px;
  border-radius: 4px;
  background: var(--ns);
  margin-top: 8px;
  overflow: hidden;
  div {
    height: 100%;
    background: var(--acc);
  }
}
.cardish .crow {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line2);
}
.pad {
  padding: 24px;
  text-align: center;
}
</style>
