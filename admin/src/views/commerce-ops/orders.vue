<template>
  <div class="commerce-wb mw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">订单</h1>
        <div class="sub">虚拟付款后自动交付；实物填单号发货；退款在此审核</div>
      </div>
    </div>

    <div class="filters">
      <label class="search">
        <MiniIcon name="search" :size="15" />
        <input v-model="keyword" type="search" placeholder="订单号、买家或商品" @keyup.enter="fetchList" />
      </label>
      <button
        v-for="c in statusChips"
        :key="c.k"
        type="button"
        class="chip"
        :class="{ on: status === c.k }"
        @click="status = c.k; fetchList()"
      >{{ c.l }}</button>
      <label class="kv" style="margin-left:auto;gap:8px">
        <span class="faint">隐藏测试订单</span>
        <label class="switch">
          <input type="checkbox" v-model="hideTest" @change="fetchList" />
          <span />
        </label>
      </label>
    </div>

    <div v-if="listError" class="empty-box">
      {{ listError }}
      <button type="button" class="btn sm" style="margin-left:8px" @click="fetchList">重试</button>
    </div>

    <div v-else class="group">
      <div class="chead">
        <span style="flex:1;padding-left:52px">商品 / 买家</span>
        <span class="c-num" style="width:80px">金额</span>
        <span class="c-pay">状态</span>
        <span class="ctime">下单</span>
        <span style="width:160px" />
      </div>
      <div v-if="!orders.length" class="muted" style="padding:28px;text-align:center">没有符合条件的订单</div>
      <div
        v-for="o in orders"
        :key="o.id"
        class="crow"
        :class="{ testrow: isTest(o) }"
      >
        <button type="button" class="ucell" @click="openDetail(o)">
          <div class="cthumb" style="width:40px;height:40px;background:#FCEBDD">
            <MiniIcon name="box" :size="16" />
          </div>
          <span style="min-width:0">
            <b>{{ firstProduct(o) }}</b>
            <span class="faint">{{ displayUser(o) }} · {{ o.order_no }}</span>
          </span>
        </button>
        <div class="c-num" style="width:80px"><b>¥{{ o.pay_amount ?? 0 }}</b></div>
        <div class="c-pay">
          <span class="tag" :class="statusTag(o.status)">{{ statusLabel(o.status) }}</span>
          <span v-if="isTest(o)" class="tag t-err">测试</span>
        </div>
        <div class="ctime faint">{{ shortTime(o.created_at) }}</div>
        <div style="width:160px;display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">
          <button
            v-if="o.status === 'refunding'"
            type="button"
            class="btn sm primary"
            @click="openDetail(o)"
          >审核退款</button>
          <button
            v-else-if="o.status === 'paid'"
            type="button"
            class="btn sm primary"
            @click="openShip(o)"
          >
            <MiniIcon name="truck" :size="13" />发货
          </button>
          <button
            v-else-if="o.status === 'closed' && Number(o.pay_amount) > 0 && !isTest(o)"
            type="button"
            class="btn sm"
            @click="doRecall([o.id])"
          >
            <MiniIcon name="send" :size="13" />召回
          </button>
          <button type="button" class="btn sm" @click="openDetail(o)">详情</button>
        </div>
      </div>
    </div>

    <div v-if="total > pageSize" class="filters" style="justify-content:flex-end;margin-top:12px">
      <button type="button" class="btn sm" :disabled="page <= 1" @click="page--; fetchList()">上一页</button>
      <span class="faint">{{ page }} / {{ Math.max(1, Math.ceil(total / pageSize)) }}</span>
      <button type="button" class="btn sm" :disabled="page * pageSize >= total" @click="page++; fetchList()">下一页</button>
    </div>

    <!-- 详情抽屉 -->
    <div v-if="drawer" class="scrim right" @click.self="drawer = null">
      <aside class="drawer" role="dialog" aria-modal="true">
        <div class="dhead">
          <div>
            <h2 class="h2" style="font-size:18px">{{ firstProduct(drawer) }}</h2>
            <div class="faint">{{ drawer.order_no }}</div>
          </div>
          <button type="button" class="iconbtn" @click="drawer = null"><MiniIcon name="x" :size="16" /></button>
        </div>

        <section class="dsec">
          <div class="dhead">
            <b>¥{{ drawer.pay_amount ?? 0 }}</b>
            <span class="tag" :class="statusTag(drawer.status)">{{ statusLabel(drawer.status) }}</span>
          </div>
          <div class="faint">买家：{{ displayUser(drawer) }} · {{ drawer.fulfillment_type === 'virtual' ? '虚拟' : '实物' }}</div>
          <div class="steps2">
            <div :class="{ ok: true }"><i /><b>下单</b><span class="faint">{{ shortTime(drawer.created_at) }}</span></div>
            <div :class="{ ok: !['pending_payment', 'closed'].includes(String(drawer.status)) }">
              <i /><b>付款</b><span class="faint">{{ drawer.payment_time ? shortTime(drawer.payment_time) : '—' }}</span>
            </div>
            <div :class="{ ok: ['shipped', 'completed', 'refunding', 'refunded'].includes(String(drawer.status)) }">
              <i /><b>{{ drawer.fulfillment_type === 'virtual' ? '交付' : '发货' }}</b>
              <span class="faint">{{ drawer.shipping_no || '—' }}</span>
            </div>
            <div :class="{ ok: ['completed', 'refunded'].includes(String(drawer.status)) }">
              <i /><b>完成</b><span class="faint">—</span>
            </div>
          </div>
        </section>

        <section v-if="drawer.status === 'paid'" class="dsec">
          <div class="dhead"><b>发货</b></div>
          <div class="row">
            <select v-model="shipForm.shipping_company" class="input" style="flex:1;min-width:100px">
              <option>顺丰速运</option>
              <option>中通快递</option>
              <option>圆通速递</option>
              <option>京东物流</option>
            </select>
            <input v-model="shipForm.shipping_no" class="input" style="flex:2;min-width:140px" placeholder="快递单号" />
          </div>
          <button type="button" class="btn sm primary" style="align-self:flex-start" @click="confirmShip">
            <MiniIcon name="truck" :size="13" />确认发货
          </button>
        </section>

        <section v-if="drawer.status === 'refunding'" class="dsec">
          <div class="dhead"><b>退款申请</b><span class="tag t-err">待审核</span></div>
          <div style="display:flex;gap:8px">
            <button type="button" class="btn primary sm" @click="doRefund(true)">同意退款</button>
            <button type="button" class="btn sm" @click="doRefund(false)">拒绝</button>
          </div>
        </section>

        <section v-if="drawer.status === 'closed' && Number(drawer.pay_amount) > 0 && !isTest(drawer)" class="dsec">
          <div class="dhead"><b>没付款</b></div>
          <div class="faint">可发召回券，通过订阅消息提醒买家。</div>
          <button type="button" class="btn sm primary" style="align-self:flex-start" @click="doRecall([drawer.id])">
            <MiniIcon name="send" :size="13" />发召回券
          </button>
        </section>

        <section class="dsec">
          <label class="kv">
            <span>这是测试订单（不计入收入和统计）</span>
            <input type="checkbox" :checked="isTest(drawer)" @change="toggleOrderTest(drawer)" />
          </label>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import { getOrderList, getOrder, shipOrder, refundApprove } from '@/api/order'
import { recallOrders, setOrderTestFlag } from '@/api/commerceOps'
import type { OrderRecord } from '@/types/order'
import { OrderStatusLabels } from '@/types/order'

const route = useRoute()
const loading = ref(false)
const listError = ref('')
const orders = ref<OrderRecord[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const keyword = ref(String(route.query.q || ''))
const status = ref(String(route.query.tab || 'all'))
const hideTest = ref(true)
const drawer = ref<OrderRecord | null>(null)
const shipForm = reactive({ shipping_company: '顺丰速运', shipping_no: '' })

const statusChips = [
  { k: 'all', l: '全部' },
  { k: 'refunding', l: '退款待审' },
  { k: 'paid', l: '待发货' },
  { k: 'completed', l: '已完成' },
  { k: 'closed', l: '未付款关闭' },
  { k: 'refunded', l: '已退款' },
  { k: 'test', l: '测试订单' },
]

function isTest(o: any) {
  return !!(o?.isTest ?? o?.is_test ?? o?.test)
}

function firstProduct(o: OrderRecord) {
  return o.items?.[0]?.product_name || '订单'
}

function displayUser(o: OrderRecord) {
  return o.user_nickname || `用户${o.user_id || ''}`
}

function statusLabel(s: string) {
  return (OrderStatusLabels as any)[s] || s
}

function statusTag(s: string) {
  if (s === 'refunding') return 't-err'
  if (s === 'paid' || s === 'completed') return 't-live'
  if (s === 'pending_payment') return 't-pending'
  return 't-draft'
}

function shortTime(t?: string) {
  if (!t) return '—'
  return String(t).replace('T', ' ').slice(5, 16)
}

async function fetchList() {
  loading.value = true
  listError.value = ''
  try {
    const params: any = {
      page: page.value,
      page_size: pageSize,
      keyword: keyword.value || undefined,
    }
    if (status.value !== 'all' && status.value !== 'test') params.status = status.value
    const res: any = await getOrderList(params)
    const data = res?.data ?? {}
    let rows: OrderRecord[] = data.records || data.items || []
    if (status.value === 'test') {
      rows = rows.filter((o) => isTest(o))
      hideTest.value = false
    } else if (hideTest.value) {
      rows = rows.filter((o) => !isTest(o))
    }
    orders.value = rows
    total.value = Number(data.total ?? rows.length)

    const openId = route.query.id
    if (openId) {
      const found = rows.find((o) => String(o.id) === String(openId))
      if (found) openDetail(found)
      else {
        try {
          const d: any = await getOrder(Number(openId))
          if (d?.data) openDetail(d.data)
        } catch { /* ignore */ }
      }
    }
  } catch (e: any) {
    listError.value = e?.message || '订单列表加载失败'
    orders.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function openDetail(o: OrderRecord) {
  try {
    const res: any = await getOrder(o.id)
    drawer.value = res?.data ?? o
  } catch {
    drawer.value = o
  }
  shipForm.shipping_no = ''
}

function openShip(o: OrderRecord) {
  openDetail(o)
}

async function confirmShip() {
  if (!drawer.value) return
  if (!shipForm.shipping_no.trim() && drawer.value.fulfillment_type !== 'virtual') {
    ElMessage.warning('请填写快递单号')
    return
  }
  try {
    const virtual = drawer.value.fulfillment_type === 'virtual'
    await shipOrder(drawer.value.id, virtual
      ? { delivery_type: 'virtual', virtual_delivery_content: '已交付' }
      : {
          delivery_type: 'physical',
          shipping_company: shipForm.shipping_company,
          shipping_no: shipForm.shipping_no,
        })
    ElMessage.success('已发货')
    drawer.value = null
    await fetchList()
  } catch (e: any) {
    ElMessage.error(e?.message || '发货失败')
  }
}

async function doRefund(approved: boolean) {
  if (!drawer.value) return
  try {
    await refundApprove(drawer.value.id, { approved, reason: approved ? undefined : '不符合退款条件' })
    ElMessage.success(approved ? '已同意退款' : '已拒绝退款')
    drawer.value = null
    await fetchList()
  } catch (e: any) {
    ElMessage.error(e?.message || '退款操作失败')
  }
}

async function doRecall(orderIds: number[]) {
  try {
    await recallOrders({
      orderIds,
      title: '还差一步就完成了',
      content: '你下单的商品还在，回来付款可享优惠',
    })
    ElMessage.success('已提交召回')
  } catch (e: any) {
    ElMessage.error(e?.message || '召回失败（commerce-ops 可能未上线）')
  }
}

async function toggleOrderTest(o: OrderRecord) {
  const next = !isTest(o)
  try {
    await setOrderTestFlag(o.id, next)
    ;(o as any).isTest = next
    ElMessage.success(next ? '已标为测试订单' : '已取消测试标记')
    await fetchList()
  } catch (e: any) {
    ElMessage.error(e?.message || '标记失败')
  }
}

watch(
  () => route.query.q,
  (q) => {
    keyword.value = String(q || '')
    fetchList()
  },
)

watch(
  () => route.query.tab,
  (t) => {
    if (t) status.value = String(t)
    fetchList()
  },
)

onMounted(fetchList)
</script>
