<template>
  <div class="order-page">
    <PageHeader
      kicker="商业变现 / 订单管理"
      title="订单管理"
      description="查看订单状态、发货与退款审核，跟踪成交与履约。"
    >
      <template #actions>
        <el-button :loading="exporting" :disabled="exporting" @click="handleExport">导出报表</el-button>
        <el-button type="warning" @click="goRefund">退款审核</el-button>
      </template>
    </PageHeader>

    <section class="stat-grid">
      <button
        v-for="item in dashboardCards"
        :key="item.key"
        type="button"
        class="stat-card"
        :class="{
          warning: item.tone === 'warning',
          danger: item.tone === 'danger',
          active: activeDashKey === item.key,
        }"
        @click="applyDashboardFilter(item)"
      >
        <span>{{ item.title }}</span>
        <strong>{{ item.value }}</strong>
        <p>{{ item.note }}</p>
      </button>
    </section>

    <section class="filter-panel">
      <div class="filter-grid">
        <el-input
          v-model="searchForm.keyword"
          placeholder="订单号 / 用户"
          clearable
          @keyup.enter="handleSearch"
        />
        <el-select v-model="searchForm.status" placeholder="全部状态" clearable @change="activeDashKey = ''">
          <el-option
            v-for="(label, key) in OrderStatusLabels"
            :key="key"
            :label="label"
            :value="key"
          />
          <el-option label="未发货" value="unshipped" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          class="filter-date"
          @change="activeDashKey = ''"
        />
      </div>
      <div class="filter-actions">
        <el-button @click="handleReset">重置</el-button>
        <el-button type="primary" @click="handleSearch">查询</el-button>
      </div>
    </section>

    <section class="table-panel">
      <div class="table-toolbar">
        <div>
          <strong>订单列表</strong>
          <span>共 {{ pagination.total }} 笔</span>
        </div>
      </div>

      <ListStateWrap
        :loading="loading"
        :empty="!loading && tableData.length === 0"
        empty-text="暂无订单数据"
        empty-description="调整筛选条件后重新查询，或等待新订单产生"
        :skeleton-rows="6"
        @retry="fetchList"
      >
        <el-table :data="tableData" stripe row-key="id" class="order-table" table-layout="auto">
          <el-table-column label="订单号" min-width="168">
            <template #default="{ row }">
              <span class="order-no">{{ row.order_no }}</span>
            </template>
          </el-table-column>
          <el-table-column label="用户" min-width="120">
            <template #default="{ row }">
              <div class="user-cell">
                <span class="user-name">{{ displayUserName(row) }}</span>
                <span v-if="displayUserPhone(row)" class="user-phone">{{ displayUserPhone(row) }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="商品" min-width="200">
            <template #default="{ row }">
              <div class="goods-cell">
                <div v-for="(item, idx) in row.items?.slice(0, 2)" :key="idx" class="order-item">
                  <span class="goods-name" :title="item.product_name">{{ item.product_name }}</span>
                </div>
                <div v-if="(row.items?.length || 0) > 2" class="more-items">
                  …共 {{ row.items.length }} 件
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="88" align="center">
            <template #default="{ row }">
              <el-tag
                size="small"
                effect="plain"
                :type="row.fulfillment_type === 'virtual' ? 'warning' : 'info'"
              >
                {{ row.fulfillment_type === 'virtual' ? '虚拟' : '实物' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="数量" width="72" align="center">
            <template #default="{ row }">
              <span class="qty-text">{{ orderQuantity(row) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="订单金额" width="110" align="right">
            <template #default="{ row }">
              <span class="amount-text">¥{{ row.pay_amount }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="96" align="center">
            <template #default="{ row }">
              <el-tag
                :type="(OrderStatusTagType[row.status as OrderStatus] as any) || 'info'"
                size="small"
                effect="plain"
              >
                {{ OrderStatusLabels[row.status as OrderStatus] || row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="下单时间" width="160">
            <template #default="{ row }">
              <span class="time-text">{{ formatOrderTime(row.created_at) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" min-width="180">
            <template #default="{ row }">
              <div class="row-actions">
                <el-button link type="primary" size="small" @click="handleDetail(row)">详情</el-button>
                <el-button
                  v-if="row.status === OrderStatus.Paid"
                  link
                  type="success"
                  size="small"
                  @click="handleShip(row)"
                >
                  {{ row.fulfillment_type === 'virtual' ? '虚拟发货' : '物流发货' }}
                </el-button>
                <el-button
                  v-if="row.status === OrderStatus.Paid || row.status === OrderStatus.Shipped"
                  link
                  type="danger"
                  size="small"
                  @click="handleRefund(row)"
                >
                  退款
                </el-button>
                <el-button
                  v-if="row.status === OrderStatus.Refunding"
                  link
                  type="warning"
                  size="small"
                  @click="goRefund"
                >
                  退款审核
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrap">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.page_size"
            :total="pagination.total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="fetchList"
            @current-change="fetchList"
          />
        </div>
      </ListStateWrap>
    </section>

    <!-- 发货/核销/确认预约弹窗 -->
    <el-dialog
      v-model="shipDialogVisible"
      :title="shipDialogTitle"
      width="520px"
      destroy-on-close
    >
      <el-form label-width="100px">
        <el-form-item label="发货方式">
          <el-radio-group v-model="currentShipType">
            <el-radio value="physical">物流发货</el-radio>
            <el-radio value="virtual">虚拟发货</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <!-- 实物：物流信息 -->
      <template v-if="currentShipType === 'physical'">
        <el-form ref="shipFormRef" :model="shipForm" :rules="shipRules" label-width="100px">
          <el-form-item label="物流公司" prop="shipping_company">
            <el-select v-model="shipForm.shipping_company" placeholder="请选择物流公司" style="width: 100%">
              <el-option label="顺丰速运" value="顺丰速运" />
              <el-option label="中通快递" value="中通快递" />
              <el-option label="圆通速递" value="圆通速递" />
              <el-option label="韵达快递" value="韵达快递" />
              <el-option label="申通快递" value="申通快递" />
              <el-option label="京东物流" value="京东物流" />
              <el-option label="极兔速递" value="极兔速递" />
              <el-option label="EMS" value="EMS" />
            </el-select>
          </el-form-item>
          <el-form-item label="物流单号" prop="shipping_no">
            <el-input v-model="shipForm.shipping_no" placeholder="请输入物流单号" />
          </el-form-item>
          <el-form-item label="发货备注">
            <el-input v-model="shipForm.remark" placeholder="选填，买家可见" />
          </el-form-item>
        </el-form>
        <div class="dialog-tip">确认后订单将进入「已发货」，买家可在订单详情查看物流信息。</div>
      </template>

      <!-- 虚拟发货：填写买家可见的发货说明 -->
      <template v-if="currentShipType === 'virtual'">
        <div class="digital-ship-content">
          <div class="ship-icon">📨</div>
          <div class="ship-title">虚拟发货</div>
          <div class="ship-desc">填写本次发货的说明，用户将在订单详情的“发货通知”中看到。</div>
          <el-input
            v-model="shipForm.virtual_delivery_content"
            type="textarea"
            :rows="5"
            maxlength="1000"
            show-word-limit
            placeholder="必填，例如：我们将在 1 个工作日内通过订单预留手机号联系您，请保持电话畅通。"
          />
        </div>
      </template>

      <template #footer>
        <el-button @click="shipDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="shipSubmitting" @click="submitShip">
          确认发货
        </el-button>
      </template>
    </el-dialog>

    <!-- 退款审核弹窗 -->
    <el-dialog
      v-model="refundDialogVisible"
      title="退款审核"
      width="520px"
      destroy-on-close
    >
      <div class="refund-info">
        <div class="refund-order">订单号：{{ currentRefundOrder?.order_no }}</div>
        <div class="refund-user">用户：{{ displayUserName(currentRefundOrder || {}) }}</div>
        <div class="refund-goods">商品：{{ currentRefundOrder?.items?.[0]?.product_name }}</div>
        <div class="refund-amount">金额：<span class="amount-text">¥{{ currentRefundOrder?.pay_amount }}</span></div>
      </div>
      <el-divider />
      <el-form ref="refundFormRef" :model="refundForm" label-width="100px">
        <el-form-item label="审核结果" prop="approved">
          <el-radio-group v-model="refundForm.approved">
            <el-radio :value="true">批准退款</el-radio>
            <el-radio :value="false">拒绝退款</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审核备注" prop="reason">
          <el-input
            v-model="refundForm.reason"
            type="textarea"
            :rows="3"
            :placeholder="refundForm.approved ? '选填，退款说明' : '请填写拒绝原因'"
          />
        </el-form-item>
      </el-form>
      <div v-if="refundForm.approved" class="dialog-tip warning">
        ⚠️ 批准退款后，微信平台将在 5 个工作日内将款项退还至买家原支付账户。
      </div>
      <template #footer>
        <el-button @click="refundDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="refundSubmitting" @click="submitRefund">
          提交审核
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import ListStateWrap from '@/components/ListStateWrap.vue'
import { getOrderList, shipOrder, getOrderStatistics } from '@/api/order'
import type { OrderRecord, OrderListParams, OrderStatistics } from '@/types/order'
import { OrderStatus, OrderStatusLabels, OrderStatusTagType } from '@/types/order'

const router = useRouter()
const loading = ref(false)
const exporting = ref(false)
const tableData = ref<OrderRecord[]>([])
const dateRange = ref<string[]>([])

const searchForm = reactive({
  keyword: '',
  status: '' as string,
})

const pagination = reactive({
  page: 1,
  page_size: 10,
  total: 0,
})

// ========== 财务统计卡片（真实数据） ==========
const orderStats = ref<OrderStatistics | null>(null)
const statsLoading = ref(false)

function formatMoney(n: number | null | undefined): string {
  const v = Number(n || 0)
  return '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatChange(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return '—'
  const arrow = rate >= 0 ? '+' : ''
  return `${arrow}${Number(rate).toFixed(1)}%`
}

function formatCount(n: number | null | undefined): string {
  return String(Number(n || 0))
}

function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function monthStartStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

type DashFilter = {
  key: string
  title: string
  value: string
  note: string
  tone?: 'default' | 'warning' | 'danger'
  status?: string
  dateMode?: 'today' | 'month' | 'none'
}

const activeDashKey = ref('')

/** 与列表筛选同源的运营计数（用 page_size=1 取 total，避免和列表不一致） */
const opsCounts = ref({
  todayOrderCount: 0,
  pendingPaymentCount: 0,
  pendingShipCount: 0,
  completedCount: 0,
  refundingCount: 0,
})

const dashboardCards = computed<DashFilter[]>(() => {
  const s = orderStats.value
  const c = opsCounts.value
  return [
    {
      key: 'today_orders',
      title: '今日订单',
      value: formatCount(c.todayOrderCount),
      note: '今日新建订单',
      dateMode: 'today',
      status: '',
    },
    {
      key: 'today_sales',
      title: '今日成交额',
      value: formatMoney(s?.todaySalesAmount),
      note: '今日已支付实付',
      dateMode: 'today',
      status: '',
    },
    {
      key: 'pending_payment',
      title: '待付款',
      value: formatCount(c.pendingPaymentCount),
      note: '等待买家付款',
      tone: 'warning',
      status: OrderStatus.PendingPayment,
      dateMode: 'none',
    },
    {
      key: 'pending_ship',
      title: '待发货',
      value: formatCount(c.pendingShipCount),
      note: '已付款待履约',
      tone: 'warning',
      status: 'unshipped',
      dateMode: 'none',
    },
    {
      key: 'completed',
      title: '已完成',
      value: formatCount(c.completedCount),
      note: '交易完成订单',
      status: OrderStatus.Completed,
      dateMode: 'none',
    },
    {
      key: 'refunding',
      title: '退款中',
      value: formatCount(c.refundingCount),
      note: '待审核售后',
      tone: 'danger',
      status: OrderStatus.Refunding,
      dateMode: 'none',
    },
    {
      key: 'month_income',
      title: '本月收入',
      value: formatMoney(s?.monthIncome),
      note: `较上月 ${formatChange(s?.incomeChangeRate)}`,
      dateMode: 'month',
      status: '',
    },
    {
      key: 'month_refund',
      title: '本月退款',
      value: formatMoney(s?.monthRefundAmount),
      note: s?.monthRefundCount
        ? `${s.monthRefundCount} 笔 · 退款率 ${Number(s.refundRate || 0).toFixed(1)}%`
        : '本月无退款',
      tone: Number(s?.monthRefundAmount || 0) > 0 ? 'danger' : 'default',
      status: OrderStatus.Refunded,
      dateMode: 'month',
    },
  ]
})

function listTotal(res: any): number {
  return Number(res?.data?.total ?? res?.total ?? 0)
}

function orderDateOnly(row: OrderRecord | Record<string, any>) {
  const raw = row.created_at ?? row.createdAt ?? ''
  return String(raw).replace('T', ' ').slice(0, 10)
}

/**
 * 按创建时间倒序扫描，收集 [start, end] 内订单。
 * 兼容后端尚未支持 startDate/endDate 的环境，保证「今日/本月」看板与列表一致。
 */
async function collectOrdersInDateRange(options: {
  start: string
  end: string
  status?: string
  keyword?: string
}) {
  const matched: OrderRecord[] = []
  let apiPage = 1
  const pageSize = 100
  let stop = false

  while (!stop && apiPage <= 40) {
    const res = await getOrderList({
      page: apiPage,
      page_size: pageSize,
      keyword: options.keyword || undefined,
      status: resolveStatusQuery(options.status) || undefined,
      // 仍传给后端；若已支持可减少扫描量
      start_date: options.start,
      end_date: options.end,
    })
    const batch = (res.data?.items || res.data?.records || []).map((row: any) => normalizeOrderRow(row))
    if (!batch.length) break

    for (const row of batch) {
      const d = orderDateOnly(row)
      if (!d) continue
      if (d > options.end) continue
      if (d < options.start) {
        stop = true
        break
      }
      matched.push(row)
    }

    const lastDate = orderDateOnly(batch[batch.length - 1])
    if (!lastDate || lastDate < options.start || batch.length < pageSize) {
      stop = true
    } else {
      apiPage += 1
    }
  }

  return matched
}

async function fetchOpsCounts() {
  const t = todayStr()
  try {
    const [todayMatched, pendingPayRes, pendingShipRes, completedRes, refundingRes] = await Promise.all([
      collectOrdersInDateRange({ start: t, end: t }),
      getOrderList({ page: 1, page_size: 1, status: OrderStatus.PendingPayment }),
      getOrderList({ page: 1, page_size: 1, status: OrderStatus.Paid }),
      getOrderList({ page: 1, page_size: 1, status: OrderStatus.Completed }),
      getOrderList({ page: 1, page_size: 1, status: OrderStatus.Refunding }),
    ])
    opsCounts.value = {
      todayOrderCount: todayMatched.length,
      pendingPaymentCount: listTotal(pendingPayRes),
      pendingShipCount: listTotal(pendingShipRes),
      completedCount: listTotal(completedRes),
      refundingCount: listTotal(refundingRes),
    }
  } catch {
    /* 保留上次计数 */
  }
}

function applyDashboardFilter(item: DashFilter) {
  if (activeDashKey.value === item.key) {
    activeDashKey.value = ''
    searchForm.status = ''
    dateRange.value = []
    pagination.page = 1
    fetchList()
    return
  }
  activeDashKey.value = item.key
  searchForm.status = item.status || ''
  if (item.dateMode === 'today') {
    const day = todayStr()
    dateRange.value = [day, day]
  } else if (item.dateMode === 'month') {
    dateRange.value = [monthStartStr(), todayStr()]
  } else {
    dateRange.value = []
  }
  pagination.page = 1
  fetchList()
}

function pickField(row: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const val = row?.[key]
    if (val !== undefined && val !== null && String(val).trim() !== '') return String(val)
  }
  return ''
}

function displayUserName(row: OrderRecord) {
  const r = row as OrderRecord & Record<string, any>
  return pickField(r, ['user_nickname', 'userNickname', 'nickname', 'user_name', 'userName']) || `用户#${row.user_id || '—'}`
}

function displayUserPhone(row: OrderRecord) {
  const r = row as OrderRecord & Record<string, any>
  return pickField(r, ['user_phone', 'userPhone', 'phone', 'mobile'])
}

function formatOrderTime(value?: string) {
  return String(value || '').replace('T', ' ').slice(0, 16)
}

function orderQuantity(row: OrderRecord) {
  const items = row.items || []
  if (!items.length) return '—'
  const total = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0)
  return total > 0 ? total : '—'
}

function normalizeOrderRow(raw: any): OrderRecord {
  const items = (raw.items || raw.orderItems || []).map((it: any) => ({
    id: Number(it.id || 0),
    product_id: Number(it.product_id ?? it.productId ?? 0),
    product_name: it.product_name ?? it.productName ?? '商品',
    sku_id: Number(it.sku_id ?? it.skuId ?? 0),
    sku_specs: it.sku_specs ?? it.skuSpecs,
    sku_image: it.sku_image ?? it.skuImage,
    price: Number(it.price ?? 0),
    quantity: Number(it.quantity ?? 1),
    subtotal: Number(it.subtotal ?? 0),
  }))
  return {
    ...raw,
    id: Number(raw.id),
    order_no: raw.order_no ?? raw.orderNo ?? '',
    user_id: Number(raw.user_id ?? raw.userId ?? 0),
    user_nickname: pickField(raw, ['user_nickname', 'userNickname', 'nickname', 'user_name', 'userName']),
    user_avatar: raw.user_avatar ?? raw.userAvatar,
    user_phone: pickField(raw, ['user_phone', 'userPhone', 'phone', 'mobile']),
    items,
    total_amount: Number(raw.total_amount ?? raw.totalAmount ?? 0),
    pay_amount: Number(raw.pay_amount ?? raw.payAmount ?? 0),
    freight_amount: Number(raw.freight_amount ?? raw.freightAmount ?? 0),
    discount_amount: Number(raw.discount_amount ?? raw.discountAmount ?? 0),
    status: raw.status,
    fulfillment_type: raw.fulfillment_type ?? raw.fulfillmentType,
    created_at: raw.created_at ?? raw.createdAt ?? '',
    updated_at: raw.updated_at ?? raw.updatedAt ?? '',
  } as OrderRecord
}

async function fetchStatistics() {
  statsLoading.value = true
  try {
    const res = await getOrderStatistics()
    const raw: any = res.data || {}
    orderStats.value = {
      todayOrderCount: Number(raw.todayOrderCount ?? raw.today_order_count ?? 0),
      todaySalesAmount: Number(raw.todaySalesAmount ?? raw.today_sales_amount ?? 0),
      pendingPaymentCount: Number(raw.pendingPaymentCount ?? raw.pending_payment_count ?? 0),
      pendingShipCount: Number(raw.pendingShipCount ?? raw.pending_ship_count ?? 0),
      shippedCount: Number(raw.shippedCount ?? raw.shipped_count ?? 0),
      refundingCount: Number(raw.refundingCount ?? raw.refunding_count ?? 0),
      monthIncome: Number(raw.monthIncome ?? raw.month_income ?? 0),
      lastMonthIncome: Number(raw.lastMonthIncome ?? raw.last_month_income ?? 0),
      incomeChangeRate: raw.incomeChangeRate ?? raw.income_change_rate ?? null,
      pendingSettleAmount: Number(raw.pendingSettleAmount ?? raw.pending_settle_amount ?? 0),
      pendingSettleCount: Number(raw.pendingSettleCount ?? raw.pending_settle_count ?? 0),
      monthRefundAmount: Number(raw.monthRefundAmount ?? raw.month_refund_amount ?? 0),
      monthRefundCount: Number(raw.monthRefundCount ?? raw.month_refund_count ?? 0),
      refundRate: Number(raw.refundRate ?? raw.refund_rate ?? 0),
      platformFee: Number(raw.platformFee ?? raw.platform_fee ?? 0),
      payFeeRate: Number(raw.payFeeRate ?? raw.pay_fee_rate ?? 0),
    }
  } catch {
    orderStats.value = null
  } finally {
    statsLoading.value = false
  }
}

// ========== 发货弹窗 ==========
const shipDialogVisible = ref(false)
const shipSubmitting = ref(false)
const shipFormRef = ref<FormInstance>()
const shippingOrderId = ref<number>(0)
const currentShipType = ref('physical')
const shipForm = reactive({
  shipping_company: '',
  shipping_no: '',
  remark: '',
  virtual_delivery_content: '',
})
const shipRules: FormRules = {
  shipping_company: [{ required: true, message: '请选择物流公司', trigger: 'change' }],
  shipping_no: [{ required: true, message: '请输入物流单号', trigger: 'blur' }],
}

const shipDialogTitle = computed(() => {
  return currentShipType.value === 'virtual' ? '数字商品交付' : '填写物流发货信息'
})

// ========== 退款弹窗 ==========
const refundDialogVisible = ref(false)
const refundSubmitting = ref(false)
const refundFormRef = ref<FormInstance>()
const currentRefundOrder = ref<any>(null)
const refundForm = reactive({
  approved: true,
  reason: '',
})

function resolveStatusQuery(status?: string) {
  if (!status) return undefined
  // 「未发货」= 已付款待发货
  if (status === 'unshipped') return OrderStatus.Paid
  return status
}

/** 加载订单列表 */
async function fetchList() {
  loading.value = true
  try {
    const start = dateRange.value?.[0]
    const end = dateRange.value?.[1]

    // 有日期条件时：本地按创建日过滤，避免后端未部署日期参数时把历史单全拉出来
    if (start && end) {
      const matched = await collectOrdersInDateRange({
        start,
        end,
        status: searchForm.status,
        keyword: searchForm.keyword,
      })
      pagination.total = matched.length
      const from = (pagination.page - 1) * pagination.page_size
      tableData.value = matched.slice(from, from + pagination.page_size)
      return
    }

    const params: OrderListParams = {
      page: pagination.page,
      page_size: pagination.page_size,
      keyword: searchForm.keyword || undefined,
      status: resolveStatusQuery(searchForm.status),
    }
    const res = await getOrderList(params)
    const items = res.data?.items || res.data?.records || []
    tableData.value = items.map((row: any) => normalizeOrderRow(row))
    pagination.total = res.data?.total || 0
  } catch {
    ElMessage.error('获取订单列表失败')
  } finally {
    loading.value = false
  }
}

/** 搜索 */
function handleSearch() {
  pagination.page = 1
  fetchList()
}

/** 重置 */
function handleReset() {
  searchForm.keyword = ''
  searchForm.status = ''
  dateRange.value = []
  activeDashKey.value = ''
  pagination.page = 1
  fetchList()
}

/** 跳转退款审核 */
function goRefund() {
  router.push({ name: 'OrderRefund' })
}

/** 查看详情 */
function handleDetail(row: OrderRecord) {
  router.push({ name: 'OrderDetail', params: { id: row.id } })
}

/** 打开发货弹窗 */
function handleShip(row: OrderRecord) {
  shippingOrderId.value = row.id
  currentShipType.value = (row as any).fulfillment_type
    || (row as any).fulfillmentType
    || (((row as any).product_type || (row as any).productType) === 'physical' ? 'physical' : 'virtual')
  shipForm.shipping_company = ''
  shipForm.shipping_no = ''
  shipForm.remark = ''
  shipForm.virtual_delivery_content = ''
  shipDialogVisible.value = true
}

/** 提交发货 */
async function submitShip() {
  if (currentShipType.value === 'physical') {
    const valid = await shipFormRef.value?.validate().catch(() => false)
    if (!valid) return
  } else if (!shipForm.virtual_delivery_content.trim()) {
    ElMessage.warning('请填写本次虚拟发货说明')
    return
  }
  shipSubmitting.value = true
  try {
    await shipOrder(shippingOrderId.value, currentShipType.value === 'physical'
      ? {
        delivery_type: 'physical',
        shipping_company: shipForm.shipping_company,
        shipping_no: shipForm.shipping_no,
      }
      : {
        delivery_type: 'virtual',
        virtual_delivery_content: shipForm.virtual_delivery_content,
      })
    const msg = currentShipType.value === 'virtual'
      ? '发货成功，用户可在订单详情查看发货通知'
      : '物流发货成功'
    ElMessage.success(msg)
    shipDialogVisible.value = false
    fetchList()
    fetchOpsCounts()
    fetchStatistics()
  } catch {
    ElMessage.error('操作失败')
  } finally {
    shipSubmitting.value = false
  }
}

/** 打开发起退款弹窗 */
function handleRefund(row: OrderRecord) {
  currentRefundOrder.value = row
  refundForm.approved = true
  refundForm.reason = ''
  refundDialogVisible.value = true
}

/** 提交退款审核 */
async function submitRefund() {
  refundSubmitting.value = true
  setTimeout(() => {
    ElMessage.success(refundForm.approved ? '退款已批准' : '退款已拒绝')
    refundDialogVisible.value = false
    refundSubmitting.value = false
    fetchList()
    fetchOpsCounts()
    fetchStatistics()
  }, 500)
}

/** 导出报表 */
async function handleExport() {
  if (exporting.value) return
  exporting.value = true
  try {
    const params: OrderListParams = {
      page: 1,
      page_size: 2000,
      keyword: searchForm.keyword || undefined,
      status: resolveStatusQuery(searchForm.status),
      start_date: dateRange.value?.[0] || undefined,
      end_date: dateRange.value?.[1] || undefined,
    }
    const res = await getOrderList(params)
    const rows: OrderRecord[] = res.data?.items || []
    if (!rows.length) {
      ElMessage.warning('暂无可导出的订单数据')
      return
    }

    const headers = ['订单号', '用户', '手机号', '商品', '商品类型', '订单金额', '状态', '下单时间']
    const lines = rows.map((row) => {
      const rowExt = row as OrderRecord & { user_phone?: string }
      const goods = (row.items || [])
        .map((item) => `${item.product_name} x${item.quantity}`)
        .join(' | ')
      const typeLabel = row.fulfillment_type === 'virtual' ? '虚拟' : '实物'
      return [
        row.order_no || '',
        row.user_nickname || '',
        rowExt.user_phone || '',
        goods,
        typeLabel,
        row.pay_amount ?? '',
        OrderStatusLabels[row.status as OrderStatus] || row.status || '',
        row.created_at || '',
      ]
        .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
        .join(',')
    })

    const csv = ['\uFEFF' + headers.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const time = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')
    link.download = `订单报表_${time}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)

    ElMessage.success(`导出成功，共 ${rows.length} 条`)
  } catch {
    ElMessage.error('导出失败，请稍后重试')
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  fetchList()
  fetchStatistics()
  fetchOpsCounts()
})
</script>

<style scoped lang="scss">
.order-page {
  padding: 4px 4px 24px;
  background: transparent;

  .filter-panel,
  .table-panel,
  .stat-card {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-elevated);
  }

  .filter-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin: 14px 0;
  }

  .stat-card {
    padding: var(--space-4) 18px;
    box-shadow: var(--shadow-sm);
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
    font: inherit;
    color: inherit;

    &:hover {
      border-color: var(--brand, #1769ff);
      box-shadow: var(--shadow-md, 0 6px 18px rgba(23, 105, 255, 0.08));
      transform: translateY(-1px);
    }

    &.active {
      border-color: var(--brand, #1769ff);
      box-shadow: 0 0 0 1px var(--brand, #1769ff);
    }

    span {
      color: var(--text-muted);
      font-size: var(--font-caption);
    }

    strong {
      display: block;
      margin-top: var(--space-2);
      color: var(--text);
      font-size: 26px;
      line-height: 1;
    }

    p {
      margin: var(--space-2) 0 0;
      color: var(--text-muted);
      font-size: var(--font-caption);
    }

    &.warning strong {
      color: #f59e0b;
    }

    &.danger strong {
      color: var(--danger, #ef4444);
    }
  }

  .filter-panel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 14px;
    padding: 14px;
  }

  .filter-grid {
    display: grid;
    grid-template-columns: minmax(200px, 1.2fr) minmax(140px, 1fr) minmax(260px, 1.4fr);
    gap: 10px;
    flex: 1;
  }

  .filter-date { width: 100%; }

  .table-panel {
    padding: 14px;
    overflow-x: auto;
  }

  .table-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 12px;

    strong {
      color: var(--text);
      font-size: var(--font-h3);
    }

    span {
      margin-left: var(--space-2);
      color: var(--text-muted);
      font-size: var(--font-caption);
    }
  }

  .order-table {
    width: 100%;
    :deep(.el-table__inner-wrapper::before) { display: none; }
  }

  .order-no {
    color: var(--text);
    font-weight: 600;
    font-size: 13px;
  }

  .user-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .user-name {
    color: var(--text);
    font-weight: 600;
    font-size: 13px;
  }

  .user-phone {
    color: var(--text-muted);
    font-size: 12px;
  }

  .goods-cell {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    min-width: 0;
  }

  .order-item {
    display: flex;
    align-items: center;
    width: 100%;
    min-width: 0;
    font-size: 13px;
  }

  .goods-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: var(--text);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .qty-text {
    color: var(--text);
    font-weight: 600;
  }

  .more-items {
    color: var(--text-muted);
    font-size: 12px;
  }

  .amount-text {
    color: #ef4444;
    font-weight: 700;
  }

  .time-text {
    color: var(--text-muted);
    font-size: 13px;
  }

  .row-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 4px;
  }

  .pagination-wrap {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}

.dialog-tip {
  padding: 12px;
  background: #f8faff;
  border-radius: 10px;
  font-size: 12px;
  color: #6b7b93;
  margin-top: 12px;

  &.warning {
    background: #fff8e6;
    color: #92400e;
  }
}

.digital-ship-content {
  text-align: center;
  padding: 24px 0;

  .ship-icon { font-size: 48px; margin-bottom: 12px; }
  .ship-title { font-size: 15px; font-weight: 700; margin-bottom: 6px; }
  .ship-desc { font-size: 13px; color: #6b7b93; margin-bottom: 16px; }
  .ship-notice {
    padding: 12px;
    background: #e8faf3;
    border-radius: 10px;
    color: #067647;
    font-size: 13px;
  }
}

.refund-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  font-size: 13px;

  .refund-order,
  .refund-user,
  .refund-goods,
  .refund-amount { padding: 6px 0; }
}

@media (max-width: 1100px) {
  .order-page {
    .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .filter-panel { flex-direction: column; align-items: stretch; }
    .filter-grid { grid-template-columns: 1fr; }
  }
}
</style>
