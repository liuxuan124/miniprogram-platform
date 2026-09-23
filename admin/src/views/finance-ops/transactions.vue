<template>
  <div class="commerce-wb mw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">收支明细</h1>
        <div class="sub">
          {{ tab === 'pending' ? '订单收入自动入账，支出手工记；两边口径一致才有意义' : '订单收入自动入账，支出手工记或导入账单' }}
        </div>
      </div>
      <div class="actions">
        <template v-if="tab === 'pending'">
          <button type="button" class="btn primary" :disabled="!pending.length" @click="confirmSyncAll">全部入账</button>
        </template>
        <template v-else>
          <button type="button" class="btn" @click="importHint">导入账单</button>
          <button type="button" class="btn" @click="doExport">导出给会计</button>
          <button type="button" class="btn primary" @click="openForm()">记一笔</button>
        </template>
      </div>
    </div>

    <div class="tabs-line">
      <button type="button" :class="{ on: tab === 'list' }" @click="setTab('list')">全部流水 {{ total }}</button>
      <button type="button" :class="{ on: tab === 'pending' }" @click="setTab('pending')">
        未入账订单 {{ pending.length }}
      </button>
    </div>

    <template v-if="tab === 'pending'">
      <div class="note">这些订单在「商业变现」里已付款，但财务里还没有对应流水。入账后会出现在收支明细、概览和报表里。</div>
      <div class="group cardish">
        <div v-for="p in pending" :key="p.orderId" class="crow">
          <div class="cmain">
            <b>{{ p.itemTitle || p.orderNo }}</b>
            <div class="cmeta">
              <span>{{ p.orderNo }}</span>
              <span>{{ p.buyerLabel }}</span>
              <span>{{ p.paidDate }}</span>
              <span class="tag t-new">{{ p.incomeCategory }}</span>
              <span v-if="p.testOrder" class="tag t-err">测试订单</span>
              <span v-if="p.zeroAmount" class="tag t-draft">¥0 免费领取</span>
            </div>
          </div>
          <div class="c-num"><b>¥{{ formatYuan(p.payAmount) }}</b></div>
          <button type="button" class="btn sm primary" @click="syncOne(p.orderId)">入账</button>
        </div>
        <div v-if="!pending.length" class="muted pad">订单都已入账</div>
      </div>
    </template>

    <template v-else>
      <div class="filters">
        <label class="search">
          <input v-model="keyword" type="search" placeholder="搜描述或分类" aria-label="搜索" />
        </label>
        <button v-for="k in kindOpts" :key="k.v" type="button" class="chip" :class="{ on: kind === k.v }" @click="kind = k.v">
          {{ k.l }}
        </button>
      </div>
      <div class="group cardish">
        <div v-for="row in list" :key="row.id" class="crow" :class="{ testrow: row.excludeFromSummary }">
          <div class="cmain">
            <b>{{ row.description }}</b>
            <div class="cmeta">
              <span class="tag" :class="row.type === 'income' ? 't-live' : 't-pending'">{{ row.type === 'income' ? '收入' : '支出' }}</span>
              <span>{{ row.category }}</span>
              <span class="tag" :class="row.source === 'order' ? 't-new' : 't-draft'">{{ sourceLabel(row.source) }}入账</span>
              <span v-if="row.excludeFromSummary && row.source === 'order'" class="tag t-err">测试/零元</span>
            </div>
          </div>
          <div class="ctime faint">{{ (row.transactionDate || '').slice(5) }}</div>
          <div class="c-num">
            <b :style="{ color: row.type === 'income' ? 'var(--g)' : 'var(--ink)' }">
              {{ row.type === 'income' ? '+' : '-' }}¥{{ formatYuan(Math.abs(Number(row.amount))) }}
            </b>
          </div>
          <button type="button" class="iconbtn" aria-label="删除" @click="remove(row)">×</button>
        </div>
        <div v-if="!list.length" class="muted pad">没有符合条件的记录</div>
      </div>
      <div class="faint">测试订单和 ¥0 的免费领取不计入概览与报表，但保留在流水里可追溯</div>
    </template>

    <el-dialog v-model="formVisible" title="记一笔" width="420px">
      <el-form label-width="88px">
        <el-form-item label="类型">
          <el-radio-group v-model="form.type">
            <el-radio value="expense">支出</el-radio>
            <el-radio value="income">收入</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="金额（元）"><el-input-number v-model="form.amount" :min="0" :precision="2" /></el-form-item>
        <el-form-item label="日期"><el-input v-model="form.transactionDate" /></el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.category" style="width: 100%">
            <el-option v-for="c in formCats" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="说明"><el-input v-model="form.description" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getTransactionList,
  createTransaction,
  deleteTransaction,
  exportTransactions,
  getPendingOrders,
  syncOrders,
  syncAllPendingOrders,
  type PendingOrderRow,
} from '@/api/finance'
import type { TransactionRecord } from '@/types/finance'
import { formatYuan } from '@/utils/financeMoney'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/utils/financeLabels'

defineOptions({ name: 'FinanceOpsTransactions' })

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const tab = ref<'list' | 'pending'>('list')
const keyword = ref('')
const kind = ref<'all' | 'income' | 'expense'>('all')
const list = ref<TransactionRecord[]>([])
const total = ref(0)
const pending = ref<PendingOrderRow[]>([])
const formVisible = ref(false)
const form = ref({
  type: 'expense' as 'income' | 'expense',
  amount: 0,
  transactionDate: new Date().toISOString().slice(0, 10),
  category: EXPENSE_CATEGORIES[0],
  description: '',
})

const kindOpts = [
  { v: 'all' as const, l: '全部' },
  { v: 'income' as const, l: '收入' },
  { v: 'expense' as const, l: '支出' },
]

const formCats = computed(() => (form.value.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES))

watch(
  () => route.query.tab,
  (t) => {
    tab.value = t === 'pending' ? 'pending' : 'list'
  },
  { immediate: true },
)

function setTab(t: 'list' | 'pending') {
  tab.value = t
  router.replace({ query: t === 'pending' ? { tab: 'pending' } : {} })
}

function sourceLabel(s?: string) {
  if (s === 'order') return '订单'
  if (s === 'import') return '导入'
  return '手工'
}

async function loadList() {
  const res = await getTransactionList({
    page: 1,
    pageSize: 200,
    keyword: keyword.value || undefined,
    type: kind.value === 'all' ? undefined : kind.value,
    approvalStatus: 'approved',
  })
  const data = (res as any)?.data
  list.value = data?.records ?? data?.list ?? []
  total.value = Number(data?.total ?? list.value.length)
}

async function loadPending() {
  const res = await getPendingOrders()
  pending.value = ((res as any)?.data ?? res ?? []) as PendingOrderRow[]
}

async function load() {
  loading.value = true
  try {
    await Promise.all([loadList(), loadPending()])
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

watch([keyword, kind], () => {
  if (tab.value === 'list') loadList()
})

async function confirmSyncAll() {
  try {
    await ElMessageBox.confirm(`把 ${pending.value.length} 笔订单入账？`, '全部入账', { type: 'warning' })
  } catch {
    return
  }
  const res = await syncAllPendingOrders()
  ElMessage.success(`已入账 ${(res as any)?.data?.synced ?? 0} 笔`)
  await load()
}

async function syncOne(id: number) {
  try {
    await ElMessageBox.confirm('确认将该订单写入收支流水？', '入账', { type: 'warning' })
  } catch {
    return
  }
  await syncOrders([id])
  ElMessage.success('已入账')
  await load()
}

function openForm() {
  formVisible.value = true
}

async function submitForm() {
  await createTransaction({
    ...form.value,
    subCategory: '',
    paymentMethod: 'other',
    counterparty: '',
  } as any)
  formVisible.value = false
  ElMessage.success('已保存')
  await loadList()
}

async function remove(row: TransactionRecord) {
  try {
    await ElMessageBox.confirm('确认删除这条流水？', '删除', { type: 'warning' })
  } catch {
    return
  }
  await deleteTransaction(row.id)
  ElMessage.success('已删除')
  await loadList()
}

function importHint() {
  ElMessage.info('请使用 CSV 导入（与旧版收支明细相同格式）；导入后可在列表中核对。')
}

async function doExport() {
  try {
    await exportTransactions({ format: 'csv' } as any)
    ElMessage.success('导出已开始')
  } catch {
    ElMessage.info('请在浏览器下载栏查看导出文件')
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.tabs-line {
  display: flex;
  gap: 18px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 12px;
  button {
    border: 0;
    background: none;
    padding: 10px 2px;
    color: var(--mute);
    border-bottom: 2px solid transparent;
    cursor: pointer;
    &.on {
      color: var(--acc);
      font-weight: 600;
      border-bottom-color: var(--acc);
    }
  }
}
.note {
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--bs);
  color: var(--b);
  font-size: 13px;
  margin-bottom: 12px;
}
.cardish {
  padding: 0;
  overflow: hidden;
}
.crow {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line2);
  &.testrow {
    background: var(--soft);
  }
}
.cmain {
  flex: 1;
  min-width: 0;
  b {
    font-weight: 500;
  }
}
.cmeta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: var(--faint);
  margin-top: 4px;
}
.c-num {
  width: 100px;
  text-align: right;
}
.ctime {
  width: 48px;
}
.pad {
  padding: 24px;
  text-align: center;
}
.iconbtn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--card);
}
.filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.search input {
  border: 0;
  outline: 0;
  min-width: 200px;
}
</style>
