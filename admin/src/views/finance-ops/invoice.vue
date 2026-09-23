<template>
  <div class="commerce-wb mw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">票据与税务</h1>
        <div class="sub">用户申请发票、你开票、月底导给会计</div>
      </div>
      <div class="actions">
        <button type="button" class="btn" @click="newInvoiceHint">手工新建发票</button>
      </div>
    </div>

    <div class="tabs-line">
      <button type="button" :class="{ on: tab === 'list' }" @click="tab = 'list'">已开与草稿 {{ invoices.length }}</button>
      <button type="button" :class="{ on: tab === 'tax' }" @click="tab = 'tax'">税率与导出</button>
    </div>

    <template v-if="tab === 'list'">
      <div v-if="sampleCount > 0" class="hint warn">
        <span
          ><b>{{ sampleCount }} 张示例发票（号码相同）</b>，是初始化的示例数据，建议清理后再录入真实发票。</span
        >
        <button type="button" class="btn sm primary" @click="confirmClean">清理示例数据</button>
      </div>
      <div class="group cardish">
        <div v-for="inv in invoices" :key="inv.id" class="crow">
          <div class="cmain">
            <b>{{ inv.invoiceNumber }}</b>
            <div class="cmeta">
              <span>{{ labelInvoiceType(inv.invoiceType) }}</span>
              <span>{{ inv.receiver }}</span>
              <span>{{ inv.issueDate }}</span>
              <span v-if="(inv as any).sample" class="tag t-err">示例数据</span>
            </div>
          </div>
          <div class="c-num">¥{{ formatYuan(Number(inv.totalAmount || inv.amount)) }}</div>
          <span class="tag" :class="inv.invoiceStatus === 'issued' ? 't-live' : 't-draft'">{{
            labelInvoiceStatus(inv.invoiceStatus)
          }}</span>
        </div>
        <div v-if="!invoices.length" class="muted pad">还没有发票</div>
      </div>
    </template>

    <template v-else>
      <section class="card">
        <h2 class="h2">导出给会计</h2>
        <div class="sub">按月导出收支流水和发票清单</div>
        <div class="row" style="gap: 10px; margin-top: 12px">
          <el-date-picker v-model="exportMonth" type="month" value-format="YYYY-MM" />
          <button type="button" class="btn primary" @click="doExport">导出</button>
        </div>
        <div class="faint" style="margin-top: 10px">导出内容：已确认流水、发票清单；不含测试订单与 ¥0 记录</div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getInvoiceList, cleanSampleInvoices, exportReport } from '@/api/finance'
import type { InvoiceRecord } from '@/types/finance'
import { formatYuan } from '@/utils/financeMoney'
import { labelInvoiceStatus, labelInvoiceType } from '@/utils/financeLabels'

defineOptions({ name: 'FinanceOpsInvoice' })

const route = useRoute()
const loading = ref(false)
const tab = ref<'list' | 'tax' | 'req'>('list')
const invoices = ref<InvoiceRecord[]>([])
const exportMonth = ref(new Date().toISOString().slice(0, 7))

const sampleCount = computed(() => invoices.value.filter((i) => (i as any).sample).length)

function newInvoiceHint() {
  ElMessage.info('完整新建/开具流程仍可用旧版发票 API；本页优先展示列表与清理示例数据。')
}

async function load() {
  loading.value = true
  try {
    const res = await getInvoiceList({ page: 1, pageSize: 100 })
    const data = (res as any)?.data
    invoices.value = data?.records ?? data?.list ?? []
  } finally {
    loading.value = false
  }
}

async function confirmClean() {
  try {
    await ElMessageBox.confirm('将删除标记为示例的发票记录，不可恢复。', '清理示例数据', { type: 'warning' })
  } catch {
    return
  }
  const res = await cleanSampleInvoices()
  ElMessage.success(`已清理 ${(res as any)?.data?.removed ?? 0} 条`)
  await load()
}

async function doExport() {
  const [y, m] = exportMonth.value.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  try {
    await exportReport({
      reportType: 'income_expense',
      startDate: `${exportMonth.value}-01`,
      endDate: `${exportMonth.value}-${String(last).padStart(2, '0')}`,
      format: 'csv',
    })
    ElMessage.success('导出已开始')
  } catch {
    ElMessage.info('请在浏览器下载栏查看')
  }
}

onMounted(() => {
  if (route.query.tab === 'req') tab.value = 'list'
  load()
})
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
.hint.warn {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--rs);
  color: var(--r);
  margin-bottom: 12px;
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
