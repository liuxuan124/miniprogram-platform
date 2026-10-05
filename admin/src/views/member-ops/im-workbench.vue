<template>
  <div class="im-workbench">
    <!-- ============ 左栏：会话列表 ============ -->
    <aside class="im-wb__left">
      <ImConversationList
        v-model:active-tab="activeTab"
        v-model:keyword="keyword"
        :conversations="conversations"
        :active-id="activeId"
        :loading="listLoading"
        @select="selectConversation"
        @refresh="loadConversations"
        @toggle-pin="togglePin"
        @toggle-resolve="toggleResolve"
      />
    </aside>

    <!-- ============ 中栏：对话流 ============ -->
    <section class="im-wb__center">
      <!-- 顶部 Context Bar -->
      <header class="ctx-bar">
        <template v-if="current">
          <div class="ctx-bar__who">
            <span class="ctx-bar__name">{{ current.nickname || '游客' }}</span>
            <el-tag v-if="current.memberLabel" size="small" effect="plain">{{ current.memberLabel }}</el-tag>
            <el-tag size="small" effect="plain" :type="statusTagType(current.status)">
              {{ current.statusLabel }}
            </el-tag>
            <span class="ctx-bar__source">{{ current.sourceLabel }}</span>
            <span class="ctx-bar__net" :class="sseConnected ? 'is-on' : 'is-off'">
              {{ sseConnected ? '实时已连接' : '连接中断，重连中' }}
            </span>
          </div>
          <div class="ctx-bar__ops">
            <el-button
              v-if="current.status === 'waiting'"
              size="small"
              type="primary"
              :loading="acting"
              @click="acceptCurrent"
            >接入</el-button>
            <el-dropdown v-if="agentsForTransfer.length" @command="doTransfer">
              <el-button size="small">转接<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="a in agentsForTransfer"
                    :key="a.agentId"
                    :command="a.agentId"
                  >
                    {{ a.agentName || `客服${a.agentId}` }}
                    <span class="dd-state">{{ a.state }}</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button
              size="small"
              :type="current.status === 'closed' ? 'primary' : ''"
              :loading="acting"
              @click="toggleConversationStatus"
            >{{ current.status === 'closed' ? '重开' : '结束会话' }}</el-button>
          </div>
        </template>
        <div v-else class="ctx-bar__empty">请选择左侧会话</div>
      </header>

      <!-- 消息流 -->
      <div ref="scrollRef" class="chat-stream" @scroll="onScroll">
        <el-empty v-if="!current" description="从左侧选择一个会话开始服务" />

        <template v-else>
          <div v-if="agentTyping" class="typing-row">
            <span class="typing-dot" /><span class="typing-dot" /><span class="typing-dot" />
            <span class="typing-text">客服正在输入…</span>
          </div>

          <div
            v-for="m in messages"
            :key="m.id"
            class="msg-row"
            :class="[
              `msg-row--${m.senderRole}`,
              { 'is-latest': m.id === lastReadAgentId },
            ]"
          >
            <!-- 系统事件不显示头像 -->
            <template v-if="m.msgType !== 'system_event'">
              <div class="msg-avatar">
                <img v-if="isAgent(m)" src="" alt="" class="msg-avatar__agent" />
                <span v-else>{{ (current.nickname || '?').charAt(0) }}</span>
              </div>
            </template>

            <div class="msg-main">
              <div class="msg-meta">
                <span class="msg-who">
                  {{ senderName(m) }}
                </span>
                <span class="msg-time">{{ shortTime(m.createTime) }}</span>
                <span v-if="isAgent(m) && !m.readByUser" class="msg-unread">未读</span>
              </div>
              <div class="msg-bubble" :class="`msg-bubble--${m.senderRole}`">
                <ImMessageCard :message="m" @send-same="sendSameProduct" />
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 底部工具栏 + 输入框 -->
      <footer v-if="current && current.status !== 'closed'" class="action-bar">
        <div class="action-bar__tools">
          <el-tooltip content="商品库：搜索站内商品并发送卡片" placement="top">
            <el-button size="small" text @click="openProductPicker">商品库</el-button>
          </el-tooltip>
          <el-tooltip content="订单库：推送该用户的订单物流" placement="top">
            <el-button size="small" text @click="openOrderPicker" :disabled="!current.userId">
              订单库
            </el-button>
          </el-tooltip>
          <el-tooltip content="发送图片" placement="top">
            <el-upload
              :show-file-list="false"
              :before-upload="beforeImageUpload"
              :http-request="handleImageUpload"
              accept="image/*"
            >
              <el-button size="small" text>发图片</el-button>
            </el-upload>
          </el-tooltip>
          <el-tooltip content="Enter 发送，Shift+Enter 换行" placement="top">
            <el-switch
              v-model="enterToSend"
              size="small"
              inline-prompt
              active-text="Enter"
              inactive-text="Ctrl"
              style="margin-left: 4px"
            />
          </el-tooltip>
        </div>

        <el-input
          v-model="inputText"
          type="textarea"
          :rows="3"
          resize="none"
          placeholder="输入回复内容…"
          @keydown="onInputKeydown"
        />

        <div class="action-bar__send">
          <el-button type="primary" :loading="sending" :disabled="!inputText.trim()" @click="sendText">
            发送
          </el-button>
        </div>
      </footer>

      <div v-else-if="current" class="action-bar action-bar--closed">
        会话已结束
        <el-button size="small" type="primary" link @click="toggleConversationStatus">重新打开</el-button>
      </div>
    </section>

    <!-- ============ 右栏：客户全景 ============ -->
    <aside class="im-wb__right">
      <ImCustomerSide
        :conversation-id="activeId"
        :customer="customer"
        :orders="orders"
        :loading="sideLoading"
        @insert-canned="insertCanned"
        @push-logistics="pushLogistics"
        @goto-order="gotoOrder"
      />
    </aside>

    <!-- ============ 商品库弹窗 ============ -->
    <el-dialog v-model="productPickerVisible" title="商品库" width="640px" append-to-body>
      <el-input
        v-model="productKeyword"
        placeholder="搜索商品名称"
        clearable
        size="small"
        class="picker-search"
        @input="loadProducts"
      />
      <div v-loading="productLoading" class="picker-body">
        <el-empty v-if="!products.length && !productLoading" description="没有匹配的商品" :image-size="60" />
        <div
          v-for="p in products"
          :key="p.id"
          class="picker-item"
          :class="{ 'is-disabled': !p.available }"
          @click="p.available && sendProduct(p.id)"
        >
          <img v-if="p.coverUrl" :src="resolveUrl(p.coverUrl)" :alt="p.title" class="picker-item__cover" />
          <div v-else class="picker-item__cover picker-item__cover--empty">无图</div>
          <div class="picker-item__info">
            <div class="picker-item__title">{{ p.title }}</div>
            <div class="picker-item__meta">
              <span class="picker-item__price">¥{{ p.price }}</span>
              <span>库存 {{ p.stock }}</span>
              <span v-if="!p.available" class="picker-item__off">已下架</span>
            </div>
          </div>
          <el-button size="small" type="primary" plain :disabled="!p.available">发送卡片</el-button>
        </div>
      </div>
    </el-dialog>

    <!-- ============ 订单库弹窗 ============ -->
    <el-dialog v-model="orderPickerVisible" title="订单库 · 推送物流" width="560px" append-to-body>
      <div v-loading="orderLoading" class="picker-body">
        <el-empty v-if="!shippableOrders.length && !orderLoading" description="该用户暂无可推送的订单" :image-size="60" />
        <div v-for="o in shippableOrders" :key="o.orderId" class="picker-item">
          <div class="picker-item__info">
            <div class="picker-item__title">{{ o.orderNo }}</div>
            <div class="picker-item__meta">
              <span>{{ o.productNames?.join('、') || '订单商品' }}</span>
            </div>
            <div v-if="o.logisticsNo" class="picker-item__meta">
              <span>{{ o.logisticsCompany }} {{ o.logisticsNo }}</span>
            </div>
          </div>
          <el-button
            size="small"
            type="primary"
            :disabled="!o.canPush"
            :title="o.canPush ? '' : '订单尚未发货，无法推送物流卡'"
            @click="sendLogistics(o.orderId)"
          >
            {{ o.canPush ? '推送物流卡' : '待发货' }}
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import ImConversationList from '@/components/im-workbench/ImConversationList.vue'
import ImMessageCard from '@/components/im-workbench/ImMessageCard.vue'
import ImCustomerSide from '@/components/im-workbench/ImCustomerSide.vue'
import {
  IM_SSE_URL,
  acceptConversation,
  closeConversation,
  getConversation,
  getCustomer,
  getShippableOrders,
  getUserOrders,
  listAgents,
  listConversations,
  pinConversation,
  pullMessages,
  searchProducts,
  sendMessage,
  setPresence,
  setTyping,
  transferConversation,
  type ImAgent,
  type ImConversation,
  type ImCustomer,
  type ImMessage,
  type ImUserOrder,
} from '@/api/imWorkbench'
import { uploadFile } from '@/api/system'
import { resolveMediaUrl } from '@/utils/media-url'

// ---------- 布局：三栏固定宽度，中栏自适应 ----------
const LEFT_W = 288
const RIGHT_W = 330

const conversations = ref<ImConversation[]>([])
const listLoading = ref(false)
const activeTab = ref('all')
const keyword = ref('')
const activeId = ref<number | null>(null)
const current = ref<ImConversation | null>(null)
const messages = ref<ImMessage[]>([])
const agents = ref<ImAgent[]>([])
const customer = ref<ImCustomer | null>(null)
const orders = ref<ImUserOrder[]>([])
const sideLoading = ref(false)
const agentTyping = ref(false)
const inputText = ref('')
const sending = ref(false)
const acting = ref(false)
const enterToSend = ref(true)
const scrollRef = ref<HTMLElement | null>(null)

// ---------- 商品/订单库 ----------
const productPickerVisible = ref(false)
const productKeyword = ref('')
const productLoading = ref(false)
const products = ref<any[]>([])
const orderPickerVisible = ref(false)
const orderLoading = ref(false)
const shippableOrders = ref<any[]>([])

// ---------- SSE ----------
const sseConnected = ref(false)
let source: EventSource | null = null
let lastEventId = 0
let reconnectTimer: number | null = null
let pullTimer: number | null = null
let typingTimer: number | null = null
// 审计：避免 SSE 与轮询同时插入同一条消息导致重复
const seenMessageIds = ref<Set<number>>(new Set())

const agentsForTransfer = computed(() => agents.value.filter((a) => a.agentId !== current.value?.agentId))
const lastReadAgentId = computed(() => {
  const agent = messages.value.filter((m) => m.senderRole === 'agent')
  return agent.length ? agent[agent.length - 1].id : 0
})

// ============ 会话列表 ============
async function loadConversations() {
  listLoading.value = true
  try {
    const res: any = await listConversations()
    const d = res?.data ?? res
    conversations.value = Array.isArray(d) ? d : d?.records || []
  } catch (e: any) {
    ElMessage.error(e?.message || '会话列表加载失败')
  } finally {
    listLoading.value = false
  }
}

async function selectConversation(c: ImConversation) {
  activeId.value = c.id
  current.value = c
  messages.value = []
  seenMessageIds.value = new Set()
  agentTyping.value = false
  await loadMessages()
  await loadSide()
  scrollToBottom()
}

async function togglePin(c: ImConversation) {
  try {
    await pinConversation(c.id, !c.pinned)
    c.pinned = !c.pinned
    ElMessage.success(c.pinned ? '已置顶' : '已取消置顶')
    loadConversations()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

async function toggleResolve(c: ImConversation) {
  try {
    if (c.status === 'closed') {
      await acceptConversation(c.id)
    } else {
      await closeConversation(c.id)
    }
    ElMessage.success('已更新')
    loadConversations()
    if (c.id === activeId.value) selectConversation(c)
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

// ============ 消息 ============
async function loadMessages() {
  if (!activeId.value) return
  try {
    const res: any = await getConversation(activeId.value)
    const d = res?.data ?? res
    const rows = Array.isArray(d?.messages) ? d.messages : []
    mergeMessages(rows)
    agentTyping.value = !!d?.agentTyping
    current.value = { ...(current.value as ImConversation), ...d, messages: undefined } as ImConversation
  } catch (e: any) {
    ElMessage.error(e?.message || '会话详情加载失败')
  }
}

/** 增量拉取（轮询兜底 + SSE 断线时用） */
async function pullOnce() {
  if (!activeId.value) return
  const last = messages.value.length ? messages.value[messages.value.length - 1].seq : undefined
  try {
    const res: any = await pullMessages(activeId.value, last)
    const d = res?.data ?? res
    mergeMessages(Array.isArray(d?.messages) ? d.messages : [])
    if (typeof d?.agentTyping === 'boolean') agentTyping.value = d.agentTyping
  } catch {
    // 拉取失败静默，SSE 仍在推；下一轮再试
  }
}

function mergeMessages(rows: ImMessage[]) {
  if (!rows?.length) return
  let added = false
  for (const m of rows) {
    if (seenMessageIds.value.has(m.id)) continue
    seenMessageIds.value.add(m.id)
    messages.value.push(m)
    added = true
  }
  if (added) {
    messages.value.sort((a, b) => (a.seq || 0) - (b.seq || 0))
    nextTick(scrollToBottom)
  }
}

async function acceptCurrent() {
  if (!activeId.value) return
  acting.value = true
  try {
    await acceptConversation(activeId.value)
    ElMessage.success('已接入')
    await loadConversations()
    await selectConversation(conversations.value.find((c) => c.id === activeId.value)!)
  } catch (e: any) {
    ElMessage.error(e?.message || '接入失败')
  } finally {
    acting.value = false
  }
}

async function toggleConversationStatus() {
  if (!activeId.value) return
  acting.value = true
  try {
    if (current.value?.status === 'closed') {
      await acceptConversation(activeId.value)
      ElMessage.success('会话已重开')
    } else {
      await closeConversation(activeId.value)
      ElMessage.success('会话已结束')
    }
    await loadConversations()
    await selectConversation(conversations.value.find((c) => c.id === activeId.value)!)
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    acting.value = false
  }
}

async function doTransfer(agentId: string) {
  if (!activeId.value) return
  const target = agents.value.find((a) => String(a.agentId) === String(agentId))
  try {
    // 静态导入即可：同文件已从 @/api/imWorkbench 引入多个函数，
    // 再用 await import() 会让 vite 报「同时被静态与动态导入」警告。
    await transferConversation(activeId.value, Number(agentId), target?.agentName || '')
    ElMessage.success('已转接')
    loadConversations()
  } catch (e: any) {
    ElMessage.error(e?.message || '转接失败')
  }
}

// ============ 发送 ============
async function sendText() {
  const text = inputText.value.trim()
  if (!text || !activeId.value) return
  sending.value = true
  try {
    await sendMessage(activeId.value, { msgType: 'text', text })
    inputText.value = ''
    await pullOnce()
    loadConversations()
  } catch (e: any) {
    ElMessage.error(e?.message || '发送失败')
  } finally {
    sending.value = false
  }
}

function onInputKeydown(e: KeyboardEvent) {
  if (!enterToSend.value) return
  if (e.key !== 'Enter') return
  // Shift+Enter 换行；Ctrl/Cmd+Enter 也发送（两种习惯都支持）
  if (e.shiftKey) return
  e.preventDefault()
  sendText()
}

async function sendProduct(productId: number) {
  if (!activeId.value) return
  try {
    await sendMessage(activeId.value, { msgType: 'product_card', productId })
    ElMessage.success('商品卡已发送')
    productPickerVisible.value = false
    await pullOnce()
    loadConversations()
  } catch (e: any) {
    ElMessage.error(e?.message || '发送失败')
  }
}

function sendSameProduct(productId: number) {
  const v = String(productId ?? '')
  if (!v) return
  sendProduct(Number(v))
}

async function sendLogistics(orderId: number) {
  if (!activeId.value) return
  try {
    await sendMessage(activeId.value, { msgType: 'logistics_card', orderId })
    ElMessage.success('物流卡已推送')
    orderPickerVisible.value = false
    await pullOnce()
    loadConversations()
  } catch (e: any) {
    ElMessage.error(e?.message || '推送失败')
  }
}

function pushLogistics(orderId: number) {
  sendLogistics(orderId)
}

function insertCanned(content: string) {
  inputText.value = inputText.value ? `${inputText.value}\n${content}` : content
}

// ============ 图片 ============
function beforeImageUpload(file: File) {
  const isImage = file.type.startsWith('image/')
  const under5M = file.size / 1024 / 1024 < 5
  if (!isImage) {
    ElMessage.error('只能上传图片')
    return false
  }
  if (!under5M) {
    ElMessage.error('图片不能超过 5MB')
    return false
  }
  return true
}

async function handleImageUpload(options: any) {
  try {
    // uploadFile 返回的是响应对象，真实 URL 在 res.data.url（内部已 normalizeUploadUrl）
    const res: any = await uploadFile(options.file)
    const url = res?.data?.url
    if (!url) throw new Error('上传失败')
    if (activeId.value) {
      await sendMessage(activeId.value, { msgType: 'image', imageUrl: String(url) })
      ElMessage.success('图片已发送')
      await pullOnce()
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '图片发送失败')
  }
}

// ============ 商品库 / 订单库 ============
async function openProductPicker() {
  productPickerVisible.value = true
  await loadProducts()
}

async function loadProducts() {
  productLoading.value = true
  try {
    const res: any = await searchProducts(productKeyword.value || undefined, 24)
    const d = res?.data ?? res
    products.value = Array.isArray(d) ? d : d?.records || []
  } catch (e: any) {
    products.value = []
  } finally {
    productLoading.value = false
  }
}

async function openOrderPicker() {
  if (!activeId.value) return
  orderPickerVisible.value = true
  orderLoading.value = true
  try {
    const res: any = await getShippableOrders(activeId.value)
    const d = res?.data ?? res
    shippableOrders.value = Array.isArray(d) ? d : d?.records || []
  } catch (e: any) {
    shippableOrders.value = []
  } finally {
    orderLoading.value = false
  }
}

// ============ 右栏数据 ============
async function loadSide() {
  if (!activeId.value) return
  sideLoading.value = true
  try {
    const [c, o] = await Promise.all([
      getCustomer(activeId.value),
      getUserOrders(activeId.value, 8).catch(() => null),
    ])
    customer.value = (c?.data ?? c) || null
    const od = o?.data ?? o
    orders.value = Array.isArray(od) ? od : []
  } catch {
    customer.value = null
    orders.value = []
  } finally {
    sideLoading.value = false
  }
}

function gotoOrder(orderId: number) {
  navigator.clipboard
    ?.writeText(String(orderId))
    .then(() => ElMessage.success('订单 ID 已复制，可在小程序订单页核对'))
    .catch(() => ElMessage.info(`订单 ID：${orderId}`))
}

// ============ SSE ============
function connectSse() {
  if (source) source.close()
  const url = lastEventId ? `${IM_SSE_URL}?lastEventId=${lastEventId}` : IM_SSE_URL
  source = new EventSource(url, { withCredentials: true })

  source.addEventListener('hello', () => {
    sseConnected.value = true
    loadConversations()
  })

  source.addEventListener('message', (e: MessageEvent) => {
    let payload: any = null
    try {
      payload = JSON.parse(e.data)
    } catch {
      return
    }
    if (e.lastEventId) lastEventId = Number(e.lastEventId) || lastEventId
    // 只处理当前打开的会话，其他会话只刷新左栏红点
    if (payload.conversationId === activeId.value) {
      mergeMessages([payload.message])
    }
    loadConversations()
  })

  // 运营告警（新订单 / 新咨询 / 超时未响应）
  source.addEventListener('operator_notice', (e: MessageEvent) => {
    let payload: any = null
    try {
      payload = JSON.parse(e.data)
    } catch {
      return
    }
    playNoticeSound()
    ElNotification({
      title: payload.title || '新动态',
      message: String(payload.content || '').replace(/\*\*/g, '').replace(/\n/g, ' ').slice(0, 90),
      type: payload.type === 'order_paid' ? 'success' : 'warning',
      duration: 6000,
    })
  })

  source.onerror = () => {
    sseConnected.value = false
    // EventSource 自带重连，但 Nginx 挂掉时会持续失败 → 自己排期兜底
    if (reconnectTimer) window.clearTimeout(reconnectTimer)
    reconnectTimer = window.setTimeout(connectSse, 5000)
  }
}

/** 新消息提示音：WebAudio 合成，不依赖外部音频文件（避免 404 静默失败） */
let audioCtx: AudioContext | null = null
function playNoticeSound() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    audioCtx = audioCtx || new Ctx()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const now = audioCtx.currentTime
    // 两声「叮咚」
    ;[
      [880, 0],
      [1174, 0.12],
    ].forEach(([freq, delay]) => {
      const osc = audioCtx!.createOscillator()
      const gain = audioCtx!.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + delay)
      gain.gain.exponentialRampToValueAtTime(0.12, now + delay + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.28)
      osc.connect(gain).connect(audioCtx!.destination)
      osc.start(now + delay)
      osc.stop(now + delay + 0.3)
    })
  } catch {
    // 浏览器自动播放策略限制：首次交互前会失败，忽略即可
  }
}

// ============ 输入中状态 ============
let typingSentAt = 0
function notifyTyping() {
  if (!activeId.value) return
  const now = Date.now()
  if (now - typingSentAt < 2500) return
  typingSentAt = now
  setTyping(activeId.value, true).catch(() => {})
  if (typingTimer) window.clearTimeout(typingTimer)
  typingTimer = window.setTimeout(() => {
    if (activeId.value) setTyping(activeId.value, false).catch(() => {})
  }, 3000)
}

watch(inputText, () => notifyTyping())

// ============ 工具 ============
function scrollToBottom() {
  const el = scrollRef.value
  if (el) el.scrollTop = el.scrollHeight
}

function onScroll() {
  // 往上翻时暂停自动滚动，避免打断阅读历史
  const el = scrollRef.value
  if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 60) {
    scrollToBottom()
  }
}

function isAgent(m: ImMessage) {
  return m.senderRole === 'agent'
}

function senderName(m: ImMessage) {
  if (m.senderRole === 'system') return '系统小助手'
  if (m.senderRole === 'agent') return m.senderName || '客服'
  return current.value?.nickname || '买家'
}

function shortTime(s?: string) {
  return s ? String(s).replace('T', ' ').slice(11, 16) : ''
}

function statusTagType(s: string) {
  if (s === 'active') return 'success'
  if (s === 'waiting') return 'warning'
  return 'info'
}

function resolveUrl(url?: string) {
  return url ? resolveMediaUrl(url) : ''
}

onMounted(async () => {
  await loadConversations()
  try {
    const res: any = await listAgents()
    const d = res?.data ?? res
    agents.value = Array.isArray(d) ? d : d?.records || []
  } catch {
    agents.value = []
  }
  setPresence('online').catch(() => {})
  connectSse()
  // 轮询兜底：SSE 断了也能收到消息（小程序端同款策略）
  pullTimer = window.setInterval(pullOnce, 5000)
  // 搜索防抖
  let kwTimer: number | null = null
  watch(keyword, (v) => {
    if (kwTimer) window.clearTimeout(kwTimer)
    kwTimer = window.setTimeout(() => {
      const kw = v.trim().toLowerCase()
      if (!kw) return
      conversations.value = conversations.value.filter(
        (c) =>
          (c.nickname || '').toLowerCase().includes(kw) ||
          (c.phone || '').includes(kw) ||
          (c.lastMessageText || '').toLowerCase().includes(kw),
      )
    }, 300)
  })
})

onBeforeUnmount(() => {
  if (source) source.close()
  if (reconnectTimer) window.clearTimeout(reconnectTimer)
  if (pullTimer) window.clearInterval(pullTimer)
  if (typingTimer) window.clearTimeout(typingTimer)
  setPresence('offline').catch(() => {})
})
</script>

<style lang="scss" scoped>
.im-workbench {
  display: grid;
  grid-template-columns: v-bind('LEFT_W + "px"') minmax(0, 1fr) v-bind('RIGHT_W + "px"');
  height: calc(100vh - 96px);
  min-height: 520px;
  background: var(--el-bg-color);
  overflow: hidden;
}

.im-wb__left,
.im-wb__center,
.im-wb__right {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.im-wb__center {
  border-left: 1px solid var(--el-border-color-lighter);
}

.ctx-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.ctx-bar__who {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.ctx-bar__name {
  font-size: 14px;
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.ctx-bar__source {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.ctx-bar__net {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 8px;
}

.ctx-bar__net.is-on {
  color: #0f6e56;
  background: #e1f5ee;
}

.ctx-bar__net.is-off {
  color: #a32d2d;
  background: #fcebeb;
}

.ctx-bar__ops {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.ctx-bar__empty {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.dd-state {
  margin-left: 6px;
  font-size: 11px;
  color: var(--el-text-color-tertiary);
}

.chat-stream {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.msg-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.msg-row--agent {
  flex-direction: row-reverse;
}

.msg-row--system {
  justify-content: center;
}

.msg-avatar {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--el-fill-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
}

.msg-main {
  min-width: 0;
  max-width: 76%;
}

.msg-row--agent .msg-main {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.msg-row--system .msg-main {
  max-width: 100%;
}

.msg-meta {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 3px;
  font-size: 11px;
  color: var(--el-text-color-tertiary);
}

.msg-row--agent .msg-meta {
  flex-direction: row-reverse;
}

.msg-unread {
  color: #a32d2d;
}

.msg-bubble {
  display: inline-block;
  padding: 7px 10px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  max-width: 100%;
}

.msg-bubble--user {
  background: var(--el-fill-color-light);
}

.msg-bubble--agent {
  background: var(--el-color-primary-light-9);
}

.msg-bubble--system {
  background: transparent;
  padding: 0;
}

.typing-row {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.typing-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--el-text-color-placeholder);
  animation: im-typing 1.2s infinite ease-in-out;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.18s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.36s;
}

.typing-text {
  margin-left: 5px;
}

@keyframes im-typing {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
  30% { transform: translateY(-3px); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .typing-dot { animation: none; }
}

.action-bar {
  flex-shrink: 0;
  border-top: 1px solid var(--el-border-color-lighter);
  padding: 8px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.action-bar--closed {
  align-items: center;
  flex-direction: row;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  padding: 14px;
}

.action-bar__tools {
  display: flex;
  align-items: center;
  gap: 2px;
}

.action-bar__send {
  display: flex;
  justify-content: flex-end;
}

.picker-search {
  margin-bottom: 10px;
}

.picker-body {
  max-height: 420px;
  overflow-y: auto;
  min-height: 120px;
}

.picker-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 7px;
  margin-bottom: 6px;
}

.picker-item:hover {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.picker-item.is-disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.picker-item__cover {
  width: 42px;
  height: 42px;
  border-radius: 5px;
  object-fit: cover;
  flex-shrink: 0;
  background: var(--el-fill-color-light);
}

.picker-item__cover--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.picker-item__info {
  flex: 1;
  min-width: 0;
}

.picker-item__title {
  font-size: 13px;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-item__meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
  flex-wrap: wrap;
}

.picker-item__price {
  color: #c2410c;
  font-weight: 500;
}

.picker-item__off {
  color: #a32d2d;
}
</style>
