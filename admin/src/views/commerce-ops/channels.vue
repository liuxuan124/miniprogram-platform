<template>
  <div class="commerce-wb mw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">渠道管理</h1>
        <div class="sub">
          渠道码带进分享链接或小程序码 scene（ch=渠道码），用户下单自动归因；佣金比例只用于报表估算，不参与实际结算
        </div>
      </div>
      <div class="actions" v-if="tab === 'list'">
        <button type="button" class="btn primary" @click="openCreate">
          <MiniIcon name="plus" :size="15" />新建渠道
        </button>
      </div>
    </div>

    <div class="tabs-line" role="tablist">
      <button type="button" :class="{ on: tab === 'list' }" @click="switchTab('list')">渠道列表</button>
      <button type="button" :class="{ on: tab === 'report' }" @click="switchTab('report')">归因报表</button>
    </div>

    <!-- 渠道列表 -->
    <template v-if="tab === 'list'">
      <div class="ch-filter">
        <button
          v-for="f in FILTERS"
          :key="f.value"
          type="button"
          class="btn sm"
          :class="{ primary: statusFilter === f.value }"
          @click="setFilter(f.value)"
        >{{ f.label }}</button>
        <span class="faint" style="margin-left:auto">共 {{ channels.length }} 个渠道</span>
      </div>

      <div v-if="listError" class="empty-box">
        {{ listError }}
        <button type="button" class="btn sm" style="margin-left:8px" @click="loadChannels">重试</button>
      </div>
      <div v-else-if="!channels.length" class="empty-box">
        暂无渠道。点右上「新建渠道」，系统自动生成 6 位渠道码
      </div>
      <div v-else class="group">
        <div class="chead">
          <span style="flex:1.6;padding:0">渠道</span>
          <span style="width:120px">渠道码</span>
          <span style="width:90px">类型</span>
          <span style="flex:1">联系人</span>
          <span style="width:70px">佣金</span>
          <span style="width:74px">状态</span>
          <span style="width:132px">操作</span>
        </div>
        <div v-for="c in channels" :key="c.id" class="crow">
          <div style="flex:1.6;min-width:0">
            <b style="font-weight:500;display:block">{{ c.channelName || '未命名渠道' }}</b>
            <span class="faint">{{ c.remark || '—' }}</span>
          </div>
          <span style="width:120px">
            <span class="ch-key">{{ c.channelKey || '—' }}</span>
          </span>
          <span style="width:90px" class="faint">{{ typeLabel(c.channelType) }}</span>
          <span style="flex:1" class="faint">{{ c.contact || '—' }}</span>
          <span style="width:70px">{{ pct(c.commissionRate) }}%</span>
          <span style="width:74px">
            <label class="switch" :title="c.status === 1 ? '点击停用' : '点击启用'">
              <input type="checkbox" :checked="c.status === 1" @change="toggleStatus(c)" />
              <span />
            </label>
          </span>
          <span style="width:132px;display:flex;gap:8px;align-items:center">
            <button type="button" class="link" style="font-size:12.5px" @click="openEdit(c)">编辑</button>
            <button type="button" class="link" style="font-size:12.5px" @click="copyParam(c)">
              <MiniIcon name="copy" :size="12" />参数
            </button>
            <button type="button" class="link" style="font-size:12.5px;color:var(--r)" @click="removeChannel(c)">删除</button>
          </span>
        </div>
      </div>

      <div class="note" style="margin-top:14px">
        用法：分享链接或小程序码 scene 里带 <code>ch={{ '{' }}渠道码{{ '}' }}</code>，小程序启动会解析并缓存该渠道，之后下单自动写入归因。
        渠道停用后，老订单的归因数据仍保留。
      </div>
    </template>

    <!-- 归因报表 -->
    <template v-else>
      <section class="card">
        <h2 class="h2">归因报表</h2>
        <div class="sub">按下单时间统计；不填时间就是全部订单</div>
        <div class="row" style="margin-top:12px">
          <div class="field" style="flex:1">
            <label>开始时间</label>
            <input v-model="rptForm.from" class="input" type="datetime-local" />
          </div>
          <div class="field" style="flex:1">
            <label>结束时间</label>
            <input v-model="rptForm.to" class="input" type="datetime-local" />
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button type="button" class="btn primary sm" @click="loadReport">查询</button>
          <button type="button" class="btn sm" @click="clearRange">清空时间</button>
        </div>

        <div v-if="reportError" class="note err" style="margin-top:12px">
          {{ reportError }}
          <button type="button" class="btn sm" style="margin-left:8px" @click="loadReport">重试</button>
        </div>
        <div v-else-if="!report.length" class="muted" style="margin-top:14px">暂无归因数据</div>
        <template v-else>
          <div class="comm-stats" style="margin-top:14px">
            <span><b>{{ int(sum('orderCount')) }}</b>订单数</span>
            <span><b>¥{{ money(sum('paidGmv')) }}</b>已付 GMV</span>
            <span><b>¥{{ money(sum('commission')) }}</b>估算佣金</span>
          </div>
          <div class="group" style="margin-top:12px">
            <div class="chead">
              <span style="flex:1.6;padding:0">渠道</span>
              <span style="width:110px">渠道码</span>
              <span style="width:70px">订单数</span>
              <span style="width:100px">下单金额</span>
              <span style="width:100px">已付 GMV</span>
              <span style="width:100px">估算佣金</span>
            </div>
            <div v-for="r in report" :key="r.channelId" class="crow">
              <span style="flex:1.6">{{ r.channelName || '—' }}</span>
              <span style="width:110px" class="faint">{{ r.channelKey || '—' }}</span>
              <span style="width:70px">{{ r.orderCount ?? 0 }}</span>
              <span style="width:100px">¥{{ money(r.gmv) }}</span>
              <span style="width:100px">¥{{ money(r.paidGmv) }}</span>
              <span style="width:100px">¥{{ money(r.commission) }}</span>
            </div>
          </div>
        </template>
      </section>
    </template>

    <!-- 新建/编辑弹层 -->
    <div v-if="formOpen" class="scrim" @click.self="formOpen = false">
      <div class="drawer" style="height:auto;max-height:90vh;width:440px;border-radius:16px;margin:auto" role="dialog">
        <div class="dhead">
          <h2 class="h2">{{ editingId ? '编辑渠道' : '新建渠道' }}</h2>
          <button type="button" class="iconbtn" @click="formOpen = false"><MiniIcon name="x" :size="16" /></button>
        </div>
        <div class="field">
          <label>渠道名称</label>
          <input v-model="form.channelName" class="input" placeholder="如：小红书博主 · 墨太白" />
        </div>
        <div v-if="!editingId" class="field">
          <label>渠道码（留空自动生成 6 位）</label>
          <input v-model="form.channelKey" class="input" placeholder="如：XHS001" />
        </div>
        <div v-else class="field">
          <label>渠道码（不可修改）</label>
          <input :value="form.channelKey" class="input" disabled />
        </div>
        <div class="row">
          <div class="field" style="flex:1">
            <label>类型</label>
            <select v-model="form.channelType" class="input">
              <option v-for="t in TYPE_OPTIONS" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </div>
          <div class="field" style="flex:1">
            <label>佣金比例（%）</label>
            <input v-model.number="form.commissionPct" class="input" type="number" min="0" max="100" step="0.1" />
          </div>
        </div>
        <div class="field">
          <label>联系人</label>
          <input v-model="form.contact" class="input" placeholder="渠道对接人 / 联系方式" />
        </div>
        <div class="field">
          <label>备注</label>
          <input v-model="form.remark" class="input" placeholder="选填" />
        </div>
        <div class="field">
          <label>状态</label>
          <select v-model.number="form.status" class="input">
            <option :value="1">启用</option>
            <option :value="0">停用</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button type="button" class="btn" @click="formOpen = false">取消</button>
          <button type="button" class="btn primary" @click="saveChannelRow">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import {
  listChannels,
  saveChannel,
  deleteChannel,
  getChannelReport,
  type ChannelRecord,
  type ChannelReportRow,
} from '@/api/channel'

const FILTERS = [
  { label: '全部', value: undefined as number | undefined },
  { label: '启用', value: 1 },
  { label: '停用', value: 0 },
]

const TYPE_OPTIONS = [
  { value: 'general', label: '通用' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'official', label: '公众号' },
  { value: 'ad', label: '广告投放' },
  { value: 'kol', label: '达人 / 博主' },
  { value: 'selfmedia', label: '自媒体' },
]

const TYPE_LABELS: Record<string, string> = {
  general: '通用',
  xiaohongshu: '小红书',
  official: '公众号',
  ad: '广告投放',
  kol: '达人 / 博主',
  selfmedia: '自媒体',
  wechat: '公众号',
}

const loading = ref(false)
const tab = ref<'list' | 'report'>('list')
const statusFilter = ref<number | undefined>(undefined)
const channels = ref<ChannelRecord[]>([])
const listError = ref('')
const report = ref<ChannelReportRow[]>([])
const reportError = ref('')

const rptForm = reactive({ from: '', to: '' })

const formOpen = ref(false)
const editingId = ref(0)
const form = reactive({
  channelName: '',
  channelKey: '',
  channelType: 'general',
  contact: '',
  remark: '',
  commissionPct: 10,
  status: 1,
})

function typeLabel(t?: string) {
  if (!t) return '通用'
  return TYPE_LABELS[t] || t
}

/** 0.1 -> 10 */
function pct(rate?: number | string) {
  const n = Number(rate || 0)
  return Number((n * 100).toFixed(2))
}

function money(v?: number | string) {
  const n = Number(v || 0)
  return n.toFixed(2)
}

function sum(key: keyof ChannelReportRow) {
  return report.value.reduce((acc, r) => acc + Number(r[key] || 0), 0)
}

function int(v: number) {
  return Math.round(v)
}

function switchTab(next: 'list' | 'report') {
  tab.value = next
  if (next === 'list') loadChannels()
  else loadReport()
}

function setFilter(v: number | undefined) {
  statusFilter.value = v
  loadChannels()
}

async function loadChannels() {
  listError.value = ''
  try {
    const res: any = await listChannels(statusFilter.value)
    channels.value = Array.isArray(res?.data) ? res.data : []
  } catch (e: any) {
    listError.value = e?.message || '渠道接口暂不可用（请确认后端已执行 V101 迁移）'
    channels.value = []
  }
}

async function loadReport() {
  reportError.value = ''
  try {
    const params: { from?: string; to?: string } = {}
    if (rptForm.from) params.from = rptForm.from.length === 16 ? `${rptForm.from}:00` : rptForm.from
    if (rptForm.to) params.to = rptForm.to.length === 16 ? `${rptForm.to}:00` : rptForm.to
    const res: any = await getChannelReport(params)
    report.value = Array.isArray(res?.data) ? res.data : []
  } catch (e: any) {
    reportError.value = e?.message || '报表接口暂不可用'
    report.value = []
  }
}

function clearRange() {
  rptForm.from = ''
  rptForm.to = ''
  loadReport()
}

function openCreate() {
  editingId.value = 0
  Object.assign(form, {
    channelName: '',
    channelKey: '',
    channelType: 'general',
    contact: '',
    remark: '',
    commissionPct: 10,
    status: 1,
  })
  formOpen.value = true
}

function openEdit(row: ChannelRecord) {
  editingId.value = Number(row.id || 0)
  Object.assign(form, {
    channelName: row.channelName || '',
    channelKey: row.channelKey || '',
    channelType: row.channelType || 'general',
    contact: row.contact || '',
    remark: row.remark || '',
    commissionPct: pct(row.commissionRate),
    status: row.status ?? 1,
  })
  formOpen.value = true
}

async function saveChannelRow() {
  if (!form.channelName.trim()) {
    ElMessage.warning('请填写渠道名称')
    return
  }
  const payload: Partial<ChannelRecord> = {
    channelName: form.channelName.trim(),
    channelType: form.channelType,
    contact: form.contact.trim(),
    remark: form.remark.trim(),
    commissionRate: Number(((form.commissionPct || 0) / 100).toFixed(4)),
    status: form.status,
  }
  if (editingId.value) {
    payload.id = editingId.value
  } else if (form.channelKey.trim()) {
    payload.channelKey = form.channelKey.trim().toUpperCase()
  }
  try {
    await saveChannel(payload)
    ElMessage.success('已保存')
    formOpen.value = false
    await loadChannels()
  } catch (e: any) {
    // 拦截器已提示；这里不再重复弹
  }
}

async function toggleStatus(row: ChannelRecord) {
  const next = row.status === 1 ? 0 : 1
  try {
    await saveChannel({
      id: row.id,
      channelName: row.channelName,
      channelType: row.channelType,
      contact: row.contact,
      remark: row.remark,
      commissionRate: row.commissionRate,
      status: next,
    })
    row.status = next
    if (statusFilter.value !== undefined) await loadChannels()
  } catch {
    /* ignore */
  }
}

async function removeChannel(row: ChannelRecord) {
  try {
    await ElMessageBox.confirm(
      `删除渠道「${row.channelName || row.channelKey}」？历史订单的归因记录会保留，但报表里该渠道将不再出现。`,
      '删除渠道',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  try {
    await deleteChannel(Number(row.id))
    ElMessage.success('已删除')
    await loadChannels()
  } catch {
    /* ignore */
  }
}

async function copyParam(row: ChannelRecord) {
  const text = `ch=${row.channelKey || ''}`
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    ElMessage.success(`已复制：${text}`)
  } catch {
    ElMessage.info(`请手动复制：${text}`)
  }
}

onMounted(() => {
  loading.value = true
  loadChannels().finally(() => {
    loading.value = false
  })
})
</script>

<style scoped>
.ch-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.ch-key {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  background: #f2ede4;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px;
  letter-spacing: 0.5px;
}

code {
  padding: 1px 5px;
  border-radius: 4px;
  background: #f2ede4;
  font-size: 12.5px;
}
</style>
