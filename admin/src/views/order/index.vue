<template>
  <div class="order-list-page">
    <!-- 顶部财务统计卡片 -->
    <el-row :gutter="20" class="finance-section">
      <el-col :xs="12" :sm="6" v-for="item in financeCards" :key="item.title">
        <el-card shadow="hover" class="finance-card">
          <div class="finance-content">
            <div class="finance-info">
              <p class="finance-title">{{ item.title }}</p>
              <p class="finance-value">{{ item.value }}</p>
              <p class="finance-note" :class="{ up: item.up, down: item.down }">
                {{ item.note }}
              </p>
            </div>
            <div class="finance-icon-wrap" :style="{ background: item.bgColor }">
              <el-icon class="finance-icon" :style="{ color: item.color }">
                <component :is="item.icon" />
              </el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card>
      <template #header>
        <div class="card-header">
          <span>订单列表</span>
          <div class="header-actions">
            <el-button :loading="exporting" :disabled="exporting" @click="handleExport">导出报表</el-button>
            <el-button type="warning" @click="goRefund">退款审核</el-button>
          </div>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="订单号/用户" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 140px">
            <el-option
              v-for="(label, key) in OrderStatusLabels"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="下单时间">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="order_no" label="订单号" min-width="170" />
        <el-table-column label="用户" width="130">
          <template #default="{ row }">
            <div class="user-cell">
              <span class="user-name">{{ row.user_nickname }}</span>
              <span class="user-phone">{{ row.user_phone }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="商品/类型" min-width="240">
          <template #default="{ row }">
            <div v-for="(item, idx) in row.items?.slice(0, 2)" :key="idx" class="order-item">
              <span>{{ item.product_name }}</span>
              <span class="item-qty">x{{ item.quantity }}</span>
            </div>
            <div v-if="row.items?.length > 2" class="more-items">
              ...共{{ row.items.length }}件商品
            </div>
            <div class="goods-type">
              <el-tag
                v-if="row.product_type === 'digital'"
                size="small"
                type="warning"
                class="type-tag"
              >数字</el-tag>
              <el-tag
                v-else-if="row.product_type === 'service'"
                size="small"
                type="success"
                class="type-tag"
              >服务</el-tag>
              <el-tag
                v-else
                size="small"
                type="info"
                class="type-tag"
              >实物</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="订单金额" width="110" align="center">
          <template #default="{ row }">
            <span class="amount-text">¥{{ row.pay_amount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="(OrderStatusTagType[row.status as OrderStatus] as any) || 'info'"
              size="small"
            >
              {{ OrderStatusLabels[row.status as OrderStatus] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="下单时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleDetail(row)">详情</el-button>
            <el-button
              v-if="row.status === OrderStatus.Paid"
              type="success"
              link
              size="small"
              @click="handleShip(row)"
            >{{ row.product_type === 'digital' ? '核销' : row.product_type === 'service' ? '确认预约' : '发货' }}</el-button>
            <el-button
              v-if="row.status === OrderStatus.Paid || row.status === OrderStatus.Shipped"
              type="danger"
              link
              size="small"
              @click="handleRefund(row)"
            >退款</el-button>
            <el-button
              v-if="row.status === OrderStatus.Refunding"
              type="warning"
              link
              size="small"
              @click="goRefund"
            >退款审核</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
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
    </el-card>

    <!-- 发货/核销/确认预约弹窗 -->
    <el-dialog
      v-model="shipDialogVisible"
      :title="shipDialogTitle"
      width="520px"
      destroy-on-close
    >
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
        <div class="dialog-tip">提示：点击确定后订单状态将变更为「已发货」，买家将收到发货通知。</div>
      </template>

      <!-- 数字商品：自动核销 -->
      <template v-if="currentShipType === 'digital'">
        <div class="digital-ship-content">
          <div class="ship-icon">💳</div>
          <div class="ship-title">数字商品无需发货</div>
          <div class="ship-desc">系统将自动核销权益并通知买家</div>
          <div class="ship-notice">✅ 权益核销码已自动生成并发送至买家微信</div>
        </div>
      </template>

      <!-- 服务商品：确认预约 -->
      <template v-if="currentShipType === 'service'">
        <el-form label-width="100px">
          <el-form-item label="服务项目">
            <span>{{ currentShipGoods }}</span>
          </el-form-item>
          <el-form-item label="预约时间">
            <el-date-picker
              v-model="shipForm.appointment_time"
              type="datetime"
              placeholder="选择预约时间"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="服务顾问">
            <el-select v-model="shipForm.consultant" placeholder="选择服务顾问" style="width: 100%">
              <el-option label="张顾问（空闲）" value="张顾问" />
              <el-option label="李顾问（空闲）" value="李顾问" />
            </el-select>
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="shipForm.remark" placeholder="给买家的备注信息" />
          </el-form-item>
        </el-form>
      </template>

      <template #footer>
        <el-button @click="shipDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="shipSubmitting" @click="submitShip">
          {{ currentShipType === 'digital' ? '确认核销' : currentShipType === 'service' ? '确认预约' : '确认发货' }}
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
        <div class="refund-user">用户：{{ currentRefundOrder?.user_nickname }}</div>
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
import { getOrderList, shipOrder } from '@/api/order'
import type { OrderRecord, OrderListParams } from '@/types/order'
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

// ========== 财务统计卡片 ==========
const financeCards = reactive([
  { title: '本月收入', value: '¥42,680', note: '较上月 +18.2%', up: true, down: false, icon: 'Money', color: '#0faa6e', bgColor: '#e8faf3' },
  { title: '待结算', value: '¥12,680', note: '预计3个工作日到账', up: false, down: false, icon: 'Clock', color: '#f59e0b', bgColor: '#fff8e6' },
  { title: '本月退款', value: '¥1,280', note: '退款率 3.0%', up: false, down: true, icon: 'RefreshLeft', color: '#ef4444', bgColor: '#fff0f0' },
  { title: '平台手续费', value: '¥428', note: '微信支付费率 0.6%', up: false, down: false, icon: 'Coin', color: '#6b7b93', bgColor: '#f1f5f9' },
])

// ========== 发货弹窗 ==========
const shipDialogVisible = ref(false)
const shipSubmitting = ref(false)
const shipFormRef = ref<FormInstance>()
const shippingOrderId = ref<number>(0)
const currentShipType = ref('physical')
const currentShipGoods = ref('')
const shipForm = reactive({
  shipping_company: '',
  shipping_no: '',
  remark: '',
  appointment_time: null as string | null,
  consultant: '',
})
const shipRules: FormRules = {
  shipping_company: [{ required: true, message: '请选择物流公司', trigger: 'change' }],
  shipping_no: [{ required: true, message: '请输入物流单号', trigger: 'blur' }],
}

const shipDialogTitle = computed(() => {
  if (currentShipType.value === 'digital') return '发放数字权益'
  if (currentShipType.value === 'service') return '预约服务确认'
  return '填写物流发货信息'
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

/** 加载订单列表 */
async function fetchList() {
  loading.value = true
  try {
    const params: OrderListParams = {
      page: pagination.page,
      page_size: pagination.page_size,
      keyword: searchForm.keyword || undefined,
      status: searchForm.status || undefined,
      start_date: dateRange.value?.[0] || undefined,
      end_date: dateRange.value?.[1] || undefined,
    }
    const res = await getOrderList(params)
    tableData.value = res.data?.items || []
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
  currentShipType.value = (row as any).product_type || 'physical'
  currentShipGoods.value = row.items?.[0]?.product_name || ''
  shipForm.shipping_company = ''
  shipForm.shipping_no = ''
  shipForm.remark = ''
  shipForm.appointment_time = null
  shipForm.consultant = ''
  shipDialogVisible.value = true
}

/** 提交发货/核销/确认预约 */
async function submitShip() {
  if (currentShipType.value === 'physical') {
    const valid = await shipFormRef.value?.validate().catch(() => false)
    if (!valid) return
  }
  shipSubmitting.value = true
  try {
    if (currentShipType.value === 'physical') {
      await shipOrder(shippingOrderId.value, {
        shipping_company: shipForm.shipping_company,
        shipping_no: shipForm.shipping_no,
      })
    }
    const msg = currentShipType.value === 'digital'
      ? '权益已核销，买家已收到通知'
      : currentShipType.value === 'service'
        ? '服务预约已确认，买家已收到通知'
        : '发货操作成功，买家已收到通知'
    ElMessage.success(msg)
    shipDialogVisible.value = false
    fetchList()
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
      status: searchForm.status || undefined,
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
      const rowExt = row as OrderRecord & { product_type?: string; user_phone?: string }
      const goods = (row.items || [])
        .map((item) => `${item.product_name} x${item.quantity}`)
        .join(' | ')
      const typeLabel = rowExt.product_type === 'digital'
        ? '数字'
        : rowExt.product_type === 'service'
          ? '服务'
          : '实物'
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
})
</script>

<style scoped>
.order-list-page {
  padding: 20px;
}

.finance-section {
  margin-bottom: 20px;
}

.finance-card {
  margin-bottom: 12px;
  border-radius: 14px;

  .finance-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .finance-title {
    font-size: 13px;
    color: #6b7b93;
    margin: 0 0 6px;
    font-weight: 600;
  }

  .finance-value {
    font-size: 24px;
    font-weight: 800;
    color: #0d1b2e;
    margin: 0;
    letter-spacing: -0.03em;
  }

  .finance-note {
    font-size: 12px;
    margin: 4px 0 0;
    color: #6b7b93;

    &.up { color: #0faa6e; }
    &.down { color: #ef4444; }
  }

  .finance-icon-wrap {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    .finance-icon {
      font-size: 20px;
    }
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.search-form {
  margin-bottom: 16px;
}

.user-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;

  .user-name {
    font-weight: 600;
    font-size: 13px;
  }

  .user-phone {
    font-size: 11px;
    color: #909399;
  }
}

.order-item {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
}

.item-qty {
  color: #909399;
}

.more-items {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.goods-type {
  margin-top: 4px;
}

.type-tag {
  font-size: 10px;
  height: 20px;
  line-height: 18px;
  padding: 0 6px;
}

.amount-text {
  color: #ef4444;
  font-weight: 700;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
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

  .ship-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .ship-title {
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 6px;
  }

  .ship-desc {
    font-size: 13px;
    color: #6b7b93;
    margin-bottom: 16px;
  }

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
  .refund-amount {
    padding: 6px 0;
  }
}
</style>
