<template>
  <div class="member-wb mw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">客服</h1>
        <div class="sub">来自小程序客服入口的咨询，能直接看到对方的会员状态</div>
      </div>
    </div>

    <div class="ov2">
      <section class="card">
        <div class="head">
          <div>
            <h2 class="h2">会话收件箱</h2>
            <div class="sub">待回复 {{ openCount }} · 已完成 {{ doneCount }}</div>
          </div>
          <div class="actions">
            <button type="button" class="chip" :class="{ on: statusFilter === 'open' }" @click="statusFilter = 'open'; loadTickets()">待回复</button>
            <button type="button" class="chip" :class="{ on: statusFilter === 'done' }" @click="statusFilter = 'done'; loadTickets()">已完成</button>
            <button type="button" class="chip" :class="{ on: statusFilter === '' }" @click="statusFilter = ''; loadTickets()">全部</button>
          </div>
        </div>

        <div v-if="ticketError" class="empty-box" style="margin-top:12px">{{ ticketError }}</div>
        <div v-else-if="!tickets.length" class="muted" style="padding:24px 0;text-align:center">暂无会话</div>
        <div v-else>
          <div v-for="t in tickets" :key="t.id" class="chatrow">
            <div class="ihead">
              <span class="uav" style="width:36px;height:36px">{{ (t.whoName || '?').charAt(0) }}</span>
              <div style="flex:1;min-width:0">
                <b>{{ t.whoName || '用户' }}</b>
                <span v-if="t.planName" class="tag t-live" style="margin-left:6px">{{ t.planName }}</span>
                <span v-if="t.source" class="tag" style="margin-left:6px">{{ sourceLabel(t.source) }}</span>
                <span v-if="t.unread" class="tag t-pending" style="margin-left:4px">未回复</span>
                <span class="tag" :class="t.status === 'open' ? 't-pending' : 't-draft'" style="margin-left:4px">
                  {{ t.status === 'open' ? '待回复' : '已完成' }}
                </span>
                <div class="faint">{{ t.phone || '' }} · {{ shortDate(t.updateTime || t.createTime) }}</div>
              </div>
            </div>
            <div class="itext" style="margin-top:8px">{{ t.lastText || '（无正文）' }}</div>
            <div v-if="t.lastReply" class="answer" style="margin-top:8px"><b>已回复：</b>{{ t.lastReply }}</div>
            <div v-if="replyingId === t.id" class="reply" style="margin-top:10px">
              <textarea v-model="replyText" class="input" rows="3" placeholder="回复内容" />
              <div style="display:flex;gap:8px">
                <button type="button" class="btn sm" @click="replyingId = null">取消</button>
                <button type="button" class="btn sm primary" style="margin-left:auto" :disabled="replying" @click="sendReply(t)">发送</button>
              </div>
            </div>
            <div v-else style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
              <button v-if="t.status === 'open'" type="button" class="btn sm primary" @click="startReply(t)">回复</button>
              <button type="button" class="btn sm" @click="openDetail(t)">查看往来</button>
              <button
                type="button"
                class="btn sm"
                @click="setStatus(t, t.status === 'open' ? 'done' : 'open')"
              >{{ t.status === 'open' ? '标为完成' : '重开' }}</button>
            </div>
          </div>
        </div>

        <div style="margin-top:20px;border-top:1px solid var(--line2);padding-top:16px">
          <h2 class="h2">用户反馈</h2>
          <div class="sub">小程序意见反馈</div>
          <div v-if="fbError" class="empty-box" style="margin-top:12px">{{ fbError }}</div>
          <div v-else-if="!feedbacks.length" class="muted" style="padding:16px 0">暂无反馈</div>
          <div v-for="f in feedbacks" :key="f.id" class="chatrow">
            <div class="ihead">
              <b>{{ f.nickname || '用户' + (f.userId || '') }}</b>
              <span class="faint" style="margin-left:auto">{{ shortDate(f.createTime) }}</span>
            </div>
            <div class="itext">{{ f.content }}</div>
            <div v-if="f.adminReply" class="answer"><b>回复：</b>{{ f.adminReply }}</div>
            <button v-else type="button" class="btn sm" style="margin-top:8px;align-self:flex-start" @click="replyFb(f)">回复</button>
          </div>
        </div>
      </section>

      <section class="card" style="display:flex;flex-direction:column;gap:12px">
        <h2 class="h2">客服入口设置</h2>
        <div v-if="svcError" class="note err">{{ svcError }}</div>
        <div class="field">
          <label for="sv-phone">客服电话</label>
          <input id="sv-phone" v-model="svc.phone" class="input" />
        </div>
        <div class="field">
          <label for="sv-wecom">企微客服链接</label>
          <input id="sv-wecom" v-model="svc.wecom" class="input" />
          <span class="faint">用户点「在线客服」时跳转</span>
        </div>
        <div class="field">
          <label for="sv-desc">在线客服说明</label>
          <textarea id="sv-desc" v-model="svc.desc" class="input" rows="2" />
        </div>
        <div class="field">
          <label for="sv-rule">进群须知</label>
          <textarea id="sv-rule" v-model="svc.rule" class="input" rows="3" />
          <span class="faint">展示在读者群二维码上方；读者群在「社区」页管理</span>
        </div>
        <div class="blk" style="background:var(--soft)">
          <b>小程序「联系我们」预览</b>
          <span>在线客服 · {{ svc.desc || '—' }}</span>
          <span>电话 {{ svc.phone || '—' }}</span>
        </div>
        <button type="button" class="btn primary" style="align-self:flex-start" :disabled="svcSaving" @click="saveSvc">保存设置</button>
      </section>
    </div>

    <!-- 完整往来消息 -->
    <el-drawer v-model="detailVisible" title="会话往来" size="420px" :destroy-on-close="true">
      <div v-if="detailTicket" class="detail-head">
        <b>{{ detailTicket.whoName || '用户' }}</b>
        <span class="faint">{{ detailTicket.phone || '未留手机号' }}</span>
      </div>
      <div v-loading="detailLoading" class="detail-body">
        <el-empty v-if="!detailLoading && !detailMessages.length" description="没有消息记录" />
        <div
          v-for="m in detailMessages"
          :key="m.id"
          class="bubble"
          :class="m.sender === 'admin' ? 'bubble--admin' : 'bubble--user'"
        >
          <div class="bubble__who">{{ m.sender === 'admin' ? '客服' : m.sender === 'system' ? '系统' : '用户' }}</div>
          <div class="bubble__text">{{ m.content }}</div>
          <div class="bubble__time">{{ shortDate(m.createTime) }}</div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { get, put } from '@/api/request'
import {
  listSupportTickets,
  listSupportTicketMessages,
  replySupportTicket,
  updateSupportTicketStatus,
  listFeedback,
  replyFeedback,
  type SupportTicket,
  type SupportMessage,
  type FeedbackItem,
} from '@/api/memberOps'

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailTicket = ref<SupportTicket | null>(null)
const detailMessages = ref<SupportMessage[]>([])

function sourceLabel(source: string) {
  const map: Record<string, string> = {
    chat: '在线咨询',
    feedback: '意见反馈',
    order: '订单咨询',
    manual: '后台建单',
  }
  return map[source] || source
}

async function openDetail(t: SupportTicket) {
  detailTicket.value = t
  detailMessages.value = []
  detailVisible.value = true
  detailLoading.value = true
  try {
    const res: any = await listSupportTicketMessages(t.id)
    const d = res?.data ?? res
    detailMessages.value = Array.isArray(d) ? d : d?.records || []
  } catch (e: any) {
    ElMessage.error(e?.message || '消息记录加载失败')
  } finally {
    detailLoading.value = false
  }
}

const loading = ref(false)
const statusFilter = ref('open')
const tickets = ref<SupportTicket[]>([])
const ticketError = ref('')
const replyingId = ref<number | null>(null)
const replyText = ref('')
const replying = ref(false)

const feedbacks = ref<FeedbackItem[]>([])
const fbError = ref('')

const svc = reactive({ phone: '', wecom: '', desc: '', rule: '' })
const svcError = ref('')
const svcSaving = ref(false)

const openCount = computed(() => tickets.value.filter((t) => t.status === 'open').length)
const doneCount = computed(() => tickets.value.filter((t) => t.status === 'done').length)

function shortDate(s?: string) {
  return s ? String(s).replace('T', ' ').slice(5, 16) : ''
}

async function loadTickets() {
  ticketError.value = ''
  try {
    const res: any = await listSupportTickets(statusFilter.value ? { status: statusFilter.value } : undefined)
    const rows = res?.data ?? res
    tickets.value = Array.isArray(rows) ? rows : rows?.records || []
  } catch (e: any) {
    ticketError.value = e?.message || '客服会话接口暂不可用'
    tickets.value = []
  }
}

function startReply(t: SupportTicket) {
  replyingId.value = t.id
  replyText.value = ''
}

async function sendReply(t: SupportTicket) {
  if (!replyText.value.trim()) {
    ElMessage.warning('请输入回复')
    return
  }
  replying.value = true
  try {
    await replySupportTicket(t.id, replyText.value)
    t.lastReply = replyText.value
    t.status = 'done'
    replyingId.value = null
    ElMessage.success('已回复')
  } catch (e: any) {
    ElMessage.error(e?.message || '回复失败')
  } finally {
    replying.value = false
  }
}

async function setStatus(t: SupportTicket, status: 'open' | 'done') {
  try {
    await updateSupportTicketStatus(t.id, status)
    t.status = status
  } catch (e: any) {
    ElMessage.error(e?.message || '更新失败')
  }
}

async function loadFeedback() {
  fbError.value = ''
  try {
    const res: any = await listFeedback()
    const rows = res?.data ?? res
    feedbacks.value = Array.isArray(rows) ? rows : rows?.records || []
  } catch (e: any) {
    fbError.value = e?.message || '反馈接口暂不可用'
    feedbacks.value = []
  }
}

async function replyFb(f: FeedbackItem) {
  try {
    const { value } = await ElMessageBox.prompt('回复内容', '回复反馈')
    await replyFeedback(f.id, value)
    f.adminReply = value
    ElMessage.success('已回复')
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '回复失败')
  }
}

async function loadSvc() {
  svcError.value = ''
  try {
    const res: any = await get('/api/v1/admin/community/config')
    const d = res?.data ?? res ?? {}
    svc.phone = d.phone || d.servicePhone || ''
    svc.wecom = d.wecom || d.wecomUrl || d.onlineUrl || ''
    svc.desc = d.desc || d.onlineDesc || d.description || ''
    svc.rule = d.rule || d.groupRule || d.joinRule || ''
  } catch (e: any) {
    svcError.value = e?.message || '客服配置加载失败'
  }
}

async function saveSvc() {
  svcSaving.value = true
  try {
    // phone / wecom / desc / rule 是 community_config 的字段名（真相源）。
    // 同时带上 servicePhone/wecomUrl 等别名，让后端归一逻辑与旧读取方都拿到同一份值。
    await put('/api/v1/admin/community/config', {
      phone: svc.phone,
      wecom: svc.wecom,
      desc: svc.desc,
      rule: svc.rule,
      servicePhone: svc.phone,
      service_phone: svc.phone,
      wecomUrl: svc.wecom,
      onlineDesc: svc.desc,
      groupRule: svc.rule,
      onlineServiceHint: svc.desc,
    })
    ElMessage.success('已保存')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    svcSaving.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([loadTickets(), loadFeedback(), loadSvc()])
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.detail-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line2, #eef0f4);
  margin-bottom: 14px;
}

.detail-body {
  min-height: 120px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bubble {
  max-width: 82%;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
}

.bubble--user {
  align-self: flex-start;
  background: #f4f5f7;
  color: #1f2430;
}

.bubble--admin {
  align-self: flex-end;
  background: #eaf3ff;
  color: #1f2430;
}

.bubble__who {
  font-size: 11px;
  color: #8a8f9c;
  margin-bottom: 4px;
}

.bubble__time {
  font-size: 11px;
  color: #a3a8b4;
  margin-top: 4px;
}
</style>
