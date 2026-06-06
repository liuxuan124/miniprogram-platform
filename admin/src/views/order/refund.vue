<template>
  <div class="refund-list-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>退款审核</span>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="退款单号/订单号/用户"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 140px">
            <el-option
              v-for="(label, key) in RefundStatusLabels"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="申请时间">
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

      <!-- 统计卡片 -->
      <div class="stat-row">
        <div class="stat-card">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">全部申请</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-value">{{ stats.pending }}</div>
          <div class="stat-label">待审批</div>
        </div>
        <div class="stat-card success">
          <div class="stat-value">{{ stats.approved }}</div>
          <div class="stat-label">已同意</div>
        </div>
        <div class="stat-card danger">
          <div class="stat-value">{{ stats.rejected }}</div>
          <div class="stat-label">已拒绝</div>
        </div>
      </div>

      <!-- 表格 -->
      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="refund_no" label="退款单号" width="170" />
        <el-table-column prop="order_no" label="订单号" width="170" />
        <el-table-column label="用户" width="130">
          <template #default="{ row }">
            <div class="user-cell">
              <span class="user-name">{{ row.user_nickname }}</span>
              <span class="user-phone">{{ row.user_phone }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="商品/类型" min-width="180">
          <template #default="{ row }">
            <div class="goods-cell">
              <span>{{ row.product_name }}</span>
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
        <el-table-column label="退款金额" width="100" align="center">
          <template #default="{ row }">
            <span class="amount-text">¥{{ row.amount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="退款原因" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="(RefundStatusTagType[row.status as RefundStatus] as any) || 'info'"
              size="small"
            >
              {{ RefundStatusLabels[row.status as RefundStatus] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="申请时间" width="170" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === RefundStatus.Pending">
              <el-button type="success" link size="small" @click="handleApprove(row, true)">批准</el-button>
              <el-button type="danger" link size="small" @click="handleApprove(row, false)">拒绝</el-button>
            </template>
            <span v-else style="font-size: 12px; color: #909399">已处理</span>
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

    <!-- 退款审批确认对话框 -->
    <el-dialog
      v-model="approveDialogVisible"
      :title="approveAction === 'approve' ? '批准退款' : '拒绝退款'"
      width="520px"
      destroy-on-close
    >
      <template v-if="approveAction === 'approve'">
        <div class="refund-detail-card">
          <div class="detail-row">
            <span class="detail-label">退款单号</span>
            <span class="detail-value">{{ currentRefund?.refund_no }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">订单号</span>
            <span class="detail-value">{{ currentRefund?.order_no }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">用户</span>
            <span class="detail-value">{{ currentRefund?.user_nickname }}（{{ currentRefund?.user_phone }}）</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">商品</span>
            <span class="detail-value">{{ currentRefund?.product_name }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">退款金额</span>
            <span class="detail-value amount-text">¥{{ currentRefund?.amount }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">退款原因</span>
            <span class="detail-value">{{ currentRefund?.reason }}</span>
          </div>
        </div>
        <el-alert
          type="warning"
          :closable="false"
          show-icon
          class="refund-alert"
        >
          <template #title>
            批准退款后，微信平台将在 5 个工作日内将款项退还至买家原支付账户。
          </template>
        </el-alert>
      </template>
      <template v-else>
        <div class="refund-detail-card">
          <div class="detail-row">
            <span class="detail-label">退款单号</span>
            <span class="detail-value">{{ currentRefund?.refund_no }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">退款金额</span>
            <span class="detail-value amount-text">¥{{ currentRefund?.amount }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">退款原因</span>
            <span class="detail-value">{{ currentRefund?.reason }}</span>
          </div>
        </div>
        <el-form :model="rejectForm" label-width="80px" style="margin-top: 16px">
          <el-form-item label="拒绝原因">
            <el-input
              v-model="rejectForm.reason"
              type="textarea"
              :rows="4"
              placeholder="请输入拒绝退款的原因（选填）"
            />
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <el-button @click="approveDialogVisible = false">取消</el-button>
        <el-button
          v-if="approveAction === 'approve'"
          type="success"
          :loading="submitting"
          @click="submitApprove"
        >确认批准</el-button>
        <el-button
          v-else
          type="danger"
          :loading="submitting"
          @click="submitApprove"
        >确认拒绝</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getRefundList, refundApprove } from '@/api/order'
import type { RefundRecord, RefundListParams } from '@/types/order'
import { RefundStatus, RefundStatusLabels, RefundStatusTagType } from '@/types/order'

const loading = ref(false)
const tableData = ref<RefundRecord[]>([])
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

// 统计
const stats = reactive({
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
})

// 审批弹窗
const approveDialogVisible = ref(false)
const submitting = ref(false)
const approveAction = ref<'approve' | 'reject'>('approve')
const currentRefund = ref<RefundRecord | null>(null)
const rejectForm = reactive({ reason: '' })

/** 加载退款列表 */
async function fetchList() {
  loading.value = true
  try {
    const params: RefundListParams = {
      page: pagination.page,
      page_size: pagination.page_size,
      keyword: searchForm.keyword || undefined,
      status: searchForm.status || undefined,
      start_date: dateRange.value?.[0] || undefined,
      end_date: dateRange.value?.[1] || undefined,
    }
    const res = await getRefundList(params)
    const data = res.data
    tableData.value = data?.items || []
    pagination.total = data?.total || 0

    // 统计各状态数量
    const all = data?.items || []
    stats.total = data?.total || 0
    stats.pending = all.filter((r: RefundRecord) => r.status === RefundStatus.Pending).length
    stats.approved = all.filter((r: RefundRecord) => r.status === RefundStatus.Approved).length
    stats.rejected = all.filter((r: RefundRecord) => r.status === RefundStatus.Rejected).length
  } catch {
    ElMessage.error('获取退款列表失败')
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

/** 打开审批弹窗 */
function handleApprove(row: RefundRecord, approved: boolean) {
  currentRefund.value = row
  approveAction.value = approved ? 'approve' : 'reject'
  rejectForm.reason = ''
  approveDialogVisible.value = true
}

/** 提交审批 */
async function submitApprove() {
  if (!currentRefund.value) return

  const isApprove = approveAction.value === 'approve'
  submitting.value = true
  try {
    await refundApprove(currentRefund.value.order_id, {
      approved: isApprove,
      reason: isApprove ? undefined : rejectForm.reason || undefined,
    })
    ElMessage.success(isApprove ? '已批准退款' : '已拒绝退款')
    approveDialogVisible.value = false
    fetchList()
  } catch {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.refund-list-page {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.search-form {
  margin-bottom: 16px;
}

/* 统计卡片 */
.stat-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}
.stat-card {
  flex: 1;
  padding: 16px 20px;
  border-radius: 8px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
}
.stat-card .stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}
.stat-card .stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}
.stat-card.warning {
  background: #fdf6ec;
  border-color: #e6a23c;
}
.stat-card.warning .stat-value {
  color: #e6a23c;
}
.stat-card.success {
  background: #f0f9eb;
  border-color: #67c23a;
}
.stat-card.success .stat-value {
  color: #67c23a;
}
.stat-card.danger {
  background: #fef0f0;
  border-color: #f56c6c;
}
.stat-card.danger .stat-value {
  color: #f56c6c;
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

.goods-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.type-tag {
  font-size: 10px;
  height: 20px;
  line-height: 18px;
  padding: 0 6px;
  flex-shrink: 0;
}

.amount-text {
  color: #ef4444;
  font-weight: 700;
}

.refund-detail-card {
  background: #f8faff;
  border: 1px solid #e4e9f2;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;

  .detail-row {
    display: flex;
    padding: 8px 0;
    border-bottom: 1px solid #eef2f8;

    &:last-child {
      border-bottom: none;
    }

    .detail-label {
      width: 100px;
      color: #6b7b93;
      font-size: 13px;
      flex-shrink: 0;
    }

    .detail-value {
      flex: 1;
      font-size: 13px;
      color: #0d1b2e;
    }
  }
}

.refund-alert {
  margin-top: 0;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
